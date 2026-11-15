import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newShow,channel,exportSnapshot,validate,importSnapshot} from '../src/core.js';
import {CONSOLES,consoleModel,ioCapacity} from '../src/consoles.js';
import {makeMix} from '../src/routing.js';
import {fxTestShow,premiumTestShow} from './fixtures/yamaha-fx-shows.js';
import {exportYamahaScene} from '../src/yamaha.js';
import {exportM32Scene,parseM32Scene} from '../src/m32.js';
import {parseMBDF,readEntry,sections,writeMBDF} from '../src/yamaha-binary.js';
import {parseCLF,clfMemory,writeCLF,fixCLChecksum} from '../src/yamaha-cl.js';
import {importCL,importDM,importM32,inspectSceneFile,readSceneFile,listCLScenes,listDMScenes} from '../src/scene-import.js';
import {planShowConversion,selectedChannelCount} from '../src/show-converter.js';
import {referenceCatalog,matchEffect,FX_REFERENCE_VERSION} from '../src/fx-equivalence.js';
const base=model=>{const p=consoleModel(model),family=p.dm||p.family;return fs.readFileSync(new URL(`../public/yamaha/${family}${family==='cl'||family==='ql'?'.CLF':family==='dm3'?'.dm3f':'.dmxf'}`,import.meta.url));};
const wingBase=JSON.parse(fs.readFileSync(new URL('../public/default.snap',import.meta.url)));
const file=(bytes,name)=>new File([bytes],name);

test('every algorithm in every available rack has an explicit documented functional profile',()=>{
 for(const model of Object.keys(CONSOLES)){const rows=referenceCatalog(model);assert.ok(rows.length,model);assert.deepEqual(rows.filter(r=>!r.known).map(r=>r.id),[],model);assert.ok(rows.every(r=>r.source?.url&&r.description&&r.replacement),model);}
 assert.ok(FX_REFERENCE_VERSION);
 assert.match(matchEffect('cl5','dm3',{model:'FREEZE'}).from.description,/échantillon/);
 assert.equal(matchEffect('cl5','dm3',{model:'FREEZE'}).status,'missing');
 assert.equal(matchEffect('wing','dm3',{model:'PCORR'}).status,'missing');
 assert.equal(matchEffect('m32','wing',{model:'WAVD'}).to,null,'a transient shaper must never become a limiter');
 assert.equal(matchEffect('m32','cl5',{model:'D/RV'}).to.kind,'delay+reverb');
 assert.equal(matchEffect('m32','cl5',{model:'CR/R'}).to.kind,'chorus+reverb');
 assert.equal(matchEffect('m32','dm3',{model:'FL/R'}).status,'approximate');
 assert.notEqual(matchEffect('wing','dm3',{model:'SHIMMER'}).to?.kind,'pitch');
});

test('24-to-16 reduction requires explicit channel checkboxes and never mutates the source',()=>{
 const s=newShow('24 voies');s.model='m32';s.channels=Array.from({length:24},(_,i)=>channel(i+1,{bank:'LCL',input:i+1,name:`Voice ${i+1}`}));const before=structuredClone(s);
 const full=planShowConversion(s,'dm3');assert.equal(full.count,24);assert.ok(full.errors.some(i=>/24.*16/.test(i.text)));
 const selected=s.channels.slice(0,16).map(c=>c.id),small=planShowConversion(s,'dm3',{selectedIds:selected});assert.equal(small.count,16);assert.equal(small.show.channels.length,16);assert.equal(small.report.removedChannels.length,8);assert.deepEqual(small.errors,[]);assert.deepEqual(s,before);
 const arbitrary=planShowConversion(s,'dm3',{selectedIds:s.channels.filter((_,i)=>i%3!==0).map(c=>c.id),channelPorts:Object.fromEntries(s.channels.filter((_,i)=>i%3!==0).map((c,i)=>[c.id,{input:i+1}]))});assert.deepEqual(arbitrary.errors,[]);assert.deepEqual(arbitrary.show.channels.map(c=>c.n),Array.from({length:16},(_,i)=>i+1));
});

test('stereo processing width is counted on the target and deletion remaps FX and groups',()=>{
 const s=newShow();s.channels=[channel(1,{name:'Drop',bank:'LCL',input:1}),channel(2,{name:'Stereo',bank:'LCL',input:3,mode:'ST'}),channel(3,{name:'Keep',bank:'LCL',input:5})];s.groupAssignments={'CH.3':{dcas:[1],mutes:[1]}};s.fx=[{id:'fx',slot:1,model:'GEQ',target:'CH',targetN:3,mix:100,position:'postins'}];
 assert.equal(selectedChannelCount(s,'m32'),4);assert.equal(selectedChannelCount(s,'wing'),3);
 const p=planShowConversion(s,'m32',{selectedIds:s.channels.slice(1).map(c=>c.id)});assert.deepEqual(p.show.channels.map(c=>c.n),[1,3]);assert.equal(p.show.fx[0].targetN,3);assert.ok(p.show.groupAssignments['CH.3'].dcas.includes(1));assert.deepEqual(p.errors,[]);
 const dropped=planShowConversion(s,'m32',{selectedIds:[s.channels[1].id]});assert.equal(dropped.show.fx.length,0);assert.equal(dropped.report.effects[0].status,'omitted');
});

test('odd-aligned stereo pairs do not create a false capacity overflow',()=>{
 const s=newShow();s.channels=[channel(1,{bank:'LCL',input:1}),channel(2,{bank:'LCL',input:3,mode:'ST'}),...Array.from({length:13},(_,i)=>channel(i+3,{bank:'LCL',input:i+5}))];
 const p=planShowConversion(s,'dm3',{bankMap:{LCL:'DANTE'},channelPorts:Object.fromEntries(s.channels.map((c,i)=>[c.id,{input:c.mode==='ST'?2:i===0?1:i+2}]))});
 assert.equal(p.count,16);assert.equal(p.show.channels.at(-1).n,16);assert.ok(!p.errors.some(e=>/voie.*capacité/.test(e.text)));assert.equal(p.show.channels.find(c=>c.mode==='ST').n,3);
});

test('M32 native reader reads the existing verified M32 export fixture and all physical settings',()=>{
 const s=importM32(fs.readFileSync(new URL('../docs/m32-export-verifie-v1.6.scn',import.meta.url),'utf8'));assert.equal(s.model,'m32');assert.ok(s.channels.length>=4);assert.ok(s.channels.some(c=>c.mode==='ST'));assert.ok(s.outputs.some(o=>o.source==='MAIN'));assert.ok(s.fx.some(f=>f.usage==='send'));assert.ok(s.fx.every(f=>Array.isArray(f.nativeParameters.values)));
 const p=planShowConversion(s,'m32r',{bankMap:{LCL:'A'},outputPorts:Object.fromEntries(s.outputs.map(o=>[o.id,{port:o.port}]))});assert.ok(p.report.issues.some(i=>i.area==='patch'));
});

test('native Yamaha readers cover all eleven models, both current and stored scene and Premium',async()=>{
 for(const model of ['ql1','ql5','cl1','cl3','cl5','dm3','dm3s','dm5','dm5c','dm7','dm7c']){
  const source=model.startsWith('dm3')?fxTestShow(model):premiumTestShow(model),bytes=await exportYamahaScene(source,base(model)),inspected=await inspectSceneFile(file(bytes,model+'.native'));
  assert.ok(inspected.scenes.length>=2,model);
  const read=consoleModel(model).dm?await importDM(bytes,model):importCL(bytes,model);
  assert.equal(read.channels[0].name,'VOCAL',model);assert.equal(read.channels[0].gain,30,model);assert.equal(read.channels[0].phantom,true,model);assert.equal(read.channels[1].mode,'ST',model);assert.equal(read.fx.length,source.fx.length,model);assert.equal(read.fx[0].returnLevel,-6,model);assert.equal(read.channels[0].hpf,120===read.channels[0].hpf?120:118,model);
  assert.equal(read.outputs.length,2,model);assert.ok(read.channels[0].matrixSends[1]?.on,model);
  const stored=inspected.scenes.find(s=>s.id!=='65534'&&!/Current/.test(s.id)&&s.name!=='Mémoire courante');if(stored){const r=await readSceneFile(inspected,{model,sceneId:stored.id});assert.equal(r.channels[0].name,'VOCAL',model+' stored');}
 }
});

test('all console pairs can convert a common subset with explicit physical mapping',()=>{
 for(const sourceModel of Object.keys(CONSOLES))for(const targetModel of Object.keys(CONSOLES)){
  const source=newShow('Common');source.model=sourceModel;source.channels=[channel(1,{name:'Vocal',bank:'LCL',input:1,mute:false,fader:-8})];source.outputs=[makeMix('MAIN',1,{mode:'ST',name:'Main LR',bank:'LCL',port:1,fader:0,mute:false})];
  const p=planShowConversion(source,targetModel);assert.deepEqual(p.errors,[],`${sourceModel} → ${targetModel}`);assert.equal(p.show.channels[0].fader,-8);assert.equal(p.show.channels[0].mute,false);
 }
});

test('M32 and Yamaha native FX parameter banks survive slot repacking within their family',async()=>{
 let s=newShow();s.model='m32';s.channels=[channel(1,{bank:'LCL',input:1})];s.fx=[{id:'eq',slot:8,model:'GEQ',usage:'insert',target:'CH',targetN:1,mix:100,position:'postins',nativeParameters:{family:'m32',model:'GEQ',values:[3.25,-2,0,8]}}];
 let plan=planShowConversion(s,'m32r'),nodes=parseM32Scene(exportM32Scene(plan.show));assert.equal(nodes.get(`/fx/${plan.show.fx[0].slot}/par`),'3.25 -2 0 8');
 for(const model of ['cl5','dm3','dm7']){const source=fxTestShow(model),bytes=await exportYamahaScene(source,base(model)),read=consoleModel(model).dm?await importDM(bytes,model):importCL(bytes,model);read.fx[0].nativeParameters.values[0]=17;plan=planShowConversion(read,model);assert.deepEqual(plan.errors,[],model);const out=await exportYamahaScene(plan.show,base(model)),again=consoleModel(model).dm?await importDM(out,model):importCL(out,model);assert.equal(again.fx[0].nativeParameters.values[0],17,model);}
});

test('same-family DM processing is reapplied while inter-family values never leak into another schema',async()=>{
 const bytes=await exportYamahaScene(fxTestShow('dm7'),base('dm7')),read=await importDM(bytes,'dm7'),bank=read.channels[0].nativeProcessingDM.sides[0],param=bank.find(v=>v.path.includes('PEQ')&&v.path.endsWith('/Gain'));assert.ok(param);param.value=475;
 const plan=planShowConversion(read,'dm7c');assert.deepEqual(plan.errors,[]);const out=await exportYamahaScene(plan.show,base('dm7c')),again=await importDM(out,'dm7c');assert.equal(again.channels[0].nativeProcessingDM.sides[0].find(v=>v.path===param.path).value,475);
 const cross=planShowConversion(read,'m32',{bankMap:{DANTE:'A'}});assert.equal(cross.show.channels[0].nativeProcessingDM,undefined);assert.ok(cross.report.issues.some(i=>i.area==='processing'&&/ne sont pas traduits/.test(i.text)));
});

test('M32 compressor EQ gate banks survive the loss of earlier channels',()=>{
 const source=importM32(fs.readFileSync(new URL('../docs/m32-export-verifie-v1.6.scn',import.meta.url),'utf8'));const c=source.channels.at(-1);c.nativeProcessingM32.sides[0]['/eq/2']='PEQ 1234 -4.5 2.0';const plan=planShowConversion(source,'m32',{selectedIds:[c.id]});assert.deepEqual(plan.errors,[]);const nodes=parseM32Scene(exportM32Scene(plan.show));assert.equal(nodes.get('/ch/01/eq/2'),'PEQ 1234 -4.5 2.0');
});

test('capacity, missing effect, physical ports and explicit removal are separate outcomes',()=>{
 const s=newShow();s.channels=[channel(1,{bank:'A',input:1})];s.fx=[{id:'pitch',slot:1,model:'PCORR',target:'CH',targetN:1,mix:100,position:'postins'}];let p=planShowConversion(s,'dm3');assert.ok(p.errors.some(i=>i.area==='patch'));assert.equal(p.report.effects[0].status,'missing');assert.match(p.report.effects[0].reason,/plugin/);
 p=planShowConversion(s,'m32',{effects:{pitch:'omit'}});assert.deepEqual(p.errors,[]);assert.equal(p.report.effects[0].status,'omitted');assert.equal(p.show.fx.length,0);
 s.fx=Array.from({length:5},(_,i)=>({id:'r'+i,slot:i+1,model:'HALL',usage:'send',sendLeft:1,sendRight:1,returnLevel:0,returnMute:false,main:true}));s.model='m32';s.mixes=[makeMix('BUS',1,{mode:'M',fader:0})];p=planShowConversion(s,'m32');assert.ok(p.errors.some(i=>/pas de slot/.test(i.text)));assert.equal(p.report.effects.at(-1).status,'unallocated');
});

test('DM3 dedicated FX buses translate to regular send buses on both other engines',async()=>{
 const read=await importDM(await exportYamahaScene(fxTestShow('dm3'),base('dm3')),'dm3');for(const model of ['wing','m32','cl5','dm7']){const p=planShowConversion(read,model,{bankMap:{LCL:model==='wing'?'A':'LCL',DANTE:['wing','m32'].includes(model)?'A':'DANTE'}});assert.deepEqual(p.errors,[],model);assert.ok(p.show.channels[0].sends);assert.ok(p.show.fx.length===2);if(model==='wing')exportSnapshot(p.show,wingBase);else if(model==='m32')exportM32Scene(p.show);else await exportYamahaScene(p.show,base(model));}
});

test('WING matrices use native MX entries and deselected template channels are silenced',()=>{
 const native=structuredClone(wingBase);native.ae_data.ch[1].in.conn={grp:'LCL',in:1};native.ae_data.ch[1].fdr=-3;native.ae_data.ch[1].mute=false;native.ae_data.ch[2].in.conn={grp:'LCL',in:2};native.ae_data.ch[2].fdr=-2;native.ae_data.ch[2].mute=false;native.ae_data.ch[2].send.MX1={on:true,lvl:-12,pre:false};native.ae_data.bus[1].name='Bus FX';native.ae_data.bus[1].send.MX2={on:true,lvl:-7,pre:true};native.ae_data.mtx[1].name='Matrix';native.ae_data.mtx[1].fdr=-6;
 const s=importSnapshot(native);assert.ok(s.channels[1].matrixSends[1].on);assert.equal(s.mixes.find(m=>m.source==='BUS'&&m.bus===1).matrixSends[2].level,-7);const plan=planShowConversion(s,'compact',{selectedIds:[s.channels[1].id]});assert.deepEqual(plan.errors,[]);const out=exportSnapshot(plan.show,wingBase);assert.equal(out.ae_data.ch[1].send.MX1.lvl,-12);assert.equal(out.ae_data.ch[2].mute,true);assert.equal(out.ae_data.ch[2].fdr,-144);assert.equal(out.ae_data.mtx[1].fdr,-6);assert.equal(out.ae_data.bus[1].send.MX2.lvl,-7);
});

test('file detection rejects corrupt, oversized and incompatible files and reads project snapshots',async()=>{
 await assert.rejects(inspectSceneFile(file('garbage','bad.scn')),/Format/);await assert.rejects(inspectSceneFile({size:40*1024*1024}),/35 Mo/);assert.throws(()=>importM32('no'),/scène/);assert.throws(()=>importCL(base('cl5'),'m32'),/modèle/);
 const s=newShow('Project');s.channels=[channel(1)];s.snapshots=[{name:'Snapshot',data:{channels:[channel(1,{name:'Snapshot Vocal'})],outputs:[],fx:[]}}];const f=await inspectSceneFile(file(JSON.stringify({application:'ChickenWing',show:s}),'project.json'));assert.equal(f.scenes.length,2);const read=await readSceneFile(f,{sceneId:'0'});assert.equal(read.channels[0].name,'Snapshot Vocal');
});

test('dual mono processors split into two WING engines instead of losing the right destination',()=>{
 const s=newShow();s.model='m32';s.channels=[channel(1,{bank:'LCL',input:1}),channel(2,{bank:'LCL',input:2})];s.fx=[{id:'dual',slot:5,model:'GEQ2',usage:'insert',target:'CH',targetN:1,rightTarget:'CH.2',position:'postins',mix:100}];
 const p=planShowConversion(s,'wing');assert.deepEqual(p.errors,[]);assert.equal(p.show.fx.length,2);assert.deepEqual(p.show.fx.map(f=>f.targetN),[1,2]);const out=exportSnapshot(p.show,wingBase);assert.equal(out.ae_data.ch[1].postins.ins,'FX1');assert.equal(out.ae_data.ch[2].postins.ins,'FX2');assert.ok(p.report.issues.some(i=>/deux instances/.test(i.text)));
});

function wingGEQSnapshot(target='MAIN',position='postins',on=false){
 const snap=structuredClone(wingBase),group={CH:'ch',BUS:'bus',MAIN:'main',MTX:'mtx'}[target];
 snap.ae_data.ch[1].in.conn={grp:'LCL',in:1};snap.ae_data.ch[1].name='Vocal';
 snap.ae_data.fx[9]={mdl:'GEQ',fxmix:100};snap.ae_data[group][1][position]={ins:'FX9',on};
 if(target!=='MAIN')snap.ae_data[group][1].busmono=true;
 return snap;
}

test('WING Compact GEQ imports its insert while bypassed and converts to DM7 with the proposed EQ',async()=>{
 for(const target of ['CH','BUS','MAIN','MTX'])for(const position of ['preins','postins'])for(const on of [true,false]){
  const snapshot=wingGEQSnapshot(target,position,on),inspected=await inspectSceneFile(file(JSON.stringify(snapshot),'compact-geq.snap')),source=await readSceneFile(inspected,{model:'compact'}),f=source.fx.find(f=>f.model==='GEQ');
  assert.ok(f,`${target} ${position} ${on}`);assert.equal(f.usage,'insert');assert.equal(f.target,target);assert.equal(f.targetN,1);assert.equal(f.bypass,!on);assert.equal(f.position,position);
  const plan=planShowConversion(source,'dm7');assert.deepEqual(plan.errors,[],`${target} ${position} ${on}`);assert.equal(plan.show.fx.length,1);assert.equal(plan.show.fx[0].target,target);assert.equal(plan.show.fx[0].bypass,!on);assert.equal(plan.show.fx[0].position,position);assert.equal(plan.show.fx[0].model,plan.report.effects[0].to.id);
 }
 // Validate the mounted replacement and bypass in the exported native DM7 file.
 const source=await readSceneFile(await inspectSceneFile(file(JSON.stringify(wingGEQSnapshot()),'compact-geq.snap')),{model:'compact'}),plan=planShowConversion(source,'dm7'),bytes=await exportYamahaScene(plan.show,base('dm7')),native=await importDM(bytes,'dm7');
 assert.equal(native.fx[0].model,plan.show.fx[0].model);assert.equal(native.fx[0].target,'MAIN');assert.equal(native.fx[0].targetN,1);assert.equal(native.fx[0].bypass,true);
});

test('old WING projects recover the GEQ binding from their native snapshot without removing the effect',()=>{
 const source=importSnapshot(wingGEQSnapshot());source.model='compact';source.mixes=[];source.fx[0]={id:'legacy-geq',slot:9,model:'GEQ',mix:100,usage:'unassigned'};
 const before=structuredClone(source),plan=planShowConversion(source,'dm7');assert.deepEqual(plan.errors,[]);assert.equal(plan.show.fx.length,1);assert.equal(plan.show.fx[0].target,'MAIN');assert.equal(plan.show.fx[0].bypass,true);assert.deepEqual(source,before);
});

test('an unbound GEQ can use the chosen replacement once its target insertion is selected',async()=>{
 const snap=wingGEQSnapshot();snap.ae_data.main[1].postins={on:false,ins:'NONE'};
 const source=await readSceneFile(await inspectSceneFile(file(JSON.stringify(snap),'unbound-geq.snap')),{model:'compact'}),geq=source.fx.find(f=>f.model==='GEQ');assert.equal(geq.usage,'unassigned');
 const blocked=planShowConversion(source,'dm7'),replacement=blocked.report.effects[0].to;assert.equal(blocked.report.effects[0].status,'unassigned');assert.ok(blocked.errors.some(e=>/destination du remplacement/.test(e.text)));
 const effects={[geq.id]:`${replacement.rack}:${replacement.id}`};assert.ok(planShowConversion(source,'dm7',{effects}).errors.length,'an algorithm choice alone must not invent an audio destination');
 const effectTargets={[geq.id]:{target:'CH',targetN:1,position:'postins'}},plan=planShowConversion(source,'dm7',{effects,effectTargets});assert.deepEqual(plan.errors,[]);assert.equal(plan.show.fx.length,1);assert.equal(plan.show.fx[0].model,replacement.id);assert.equal(plan.show.fx[0].target,'CH');
 const bytes=await exportYamahaScene(plan.show,base('dm7')),native=await importDM(bytes,'dm7');assert.equal(native.fx[0].model,replacement.id);assert.equal(native.fx[0].target,'CH');assert.equal(native.fx[0].targetN,1);
 const onMain=planShowConversion(source,'dm7',{effectTargets:{[geq.id]:{target:'MAIN',targetN:1,position:'postins'}}});assert.deepEqual(onMain.errors,[]);assert.ok(onMain.show.mixes.some(m=>m.source==='MAIN'&&m.bus===1));
 const invalid=planShowConversion(source,'dm7',{effects,effectTargets:{[geq.id]:{target:'CH',targetN:99,position:'postins'}}});assert.ok(invalid.errors.some(e=>/destination.*invalide/.test(e.text)));
 const removed=planShowConversion(source,'dm7',{effects:{[geq.id]:'omit'}});assert.deepEqual(removed.errors,[]);assert.equal(removed.show.fx.length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {consoleProfile,consoleModel,consoleOptions,isYamaha,ioCapacity,logicalWidth,channelCount,nativeExtension,bankOptions} from '../src/consoles.js';
import {newShow,channel,validate,assertProject,exportSnapshot} from '../src/core.js';
import {createWizardShow} from '../src/show-builder.js';
import {configureWizardYamaha} from '../src/yamaha-ui.js';
import {exportYamahaScene} from '../src/yamaha.js';
import {parseCLF,writeCLF,clfMemory,clOutputOffset,yamahaFader} from '../src/yamaha-cl.js';
import {parseMBDF,readEntry,writeMBDF,sections} from '../src/yamaha-binary.js';
import {stageboxBank,validateStageboxes,flattenYamahaPatch,yamahaConnectionPlan} from '../src/yamaha-stageboxes.js';
import {getAssignment,setAssignment} from '../src/groups.js';
import {getMixes,setSend,canRoute} from '../src/routing.js';
import {planInsert,planRenumber} from '../src/patch.js';
import {planRiderImport} from '../src/import-plan.js';
import {yamahaTestShow} from './fixtures/yamaha-shows.js';
const ids=['ql1','ql5','cl1','cl3','cl5','dm3','dm3s','dm5','dm5c','dm7','dm7c'];
const template=model=>{const m=consoleModel(model),family=m.dm||m.family;return fs.readFileSync(new URL(`../public/yamaha/${family}${['dm5','dm7'].includes(family)?'.dmxf':family.startsWith('dm')?'.'+family+'f':'.CLF'}`,import.meta.url));};
const mem=(bytes,id=65534)=>clfMemory(parseCLF(bytes).children.find(c=>c.id===16).node.children.find(c=>c.id===id).node);
const checkSum=b=>{const v=new DataView(b.buffer,b.byteOffset,b.byteLength);let sum=0;for(let i=0;i<b.length;i+=4)sum=(sum+v.getUint32(i))>>>0;assert.equal(sum,0xffffffff);};

test('all eleven Yamaha models expose their own DSP and physical capacities',()=>{
 assert.deepEqual(consoleOptions('yamaha','ql').map(([id])=>id),['ql1','ql5']);
 assert.deepEqual(consoleOptions('yamaha','cl').map(([id])=>id),['cl1','cl3','cl5']);
 for(const [id,ch,bus,localIn,localOut]of [['ql1',32,16,16,8],['ql5',64,16,32,16],['cl1',48,24,8,8],['cl3',64,24,8,8],['cl5',72,24,8,8],['dm3',16,6,16,8],['dm3s',16,6,16,8],['dm5',60,24,32,16],['dm5c',48,24,16,16],['dm7',120,48,32,16],['dm7c',72,48,16,16]]){assert.ok(isYamaha(id));assert.equal(consoleProfile(id).channels,ch);assert.equal(consoleProfile(id).buses,bus);assert.equal(ioCapacity('LCL',id),localIn);assert.equal(ioCapacity('LCL',id,true),localOut);assert.equal(ioCapacity('A',id),0);}
 assert.equal(ioCapacity('DANTE','dm3s'),0);assert.equal(ioCapacity('DANTE','ql1'),32);assert.equal(ioCapacity('DANTE','dm7'),144);assert.equal(ioCapacity('DANTE','dm5'),64);assert.equal(ioCapacity('AES','dm7'),4);assert.equal(ioCapacity('AES','dm7c',true),2);assert.equal(consoleProfile('dm3').mute,6);
});
test('Yamaha wizard, stereo insertion and JSON restore retain stageboxes and capacities',()=>{
 for(const model of ids){const w={name:'Show',model,stageboxPreset:model==='dm3s'?'none':'rio1608d2',preset:'empty',count:8,wedges:2,iems:1,groups:0,fxBuses:0,extraBuses:0,mainLR:true};configureWizardYamaha(w);const s=createWizardShow(w);assert.deepEqual(validate(s).filter(i=>i.level==='error'),[],model);const restored=assertProject(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.stageboxes,s.stageboxes);assert.equal(restored.model,model);assert.throws(()=>exportSnapshot(s,{}),/Yamaha/);}
 const s=yamahaTestShow('dm7'),p=planInsert(s,'inputs',{name:'Spare',n:1,port:1,bank:'LCL',mode:'ST',shiftNumbers:true});assert.equal(p.show.channels.find(c=>c.name==='VOCAL').n,3);assert.equal(getAssignment(p.show,'CH.3').dcas[0],24);assert.equal(logicalWidth(s,s.channels[1]),2);assert.equal(channelCount(s),3);
});
test('Yamaha validates DSP overlap, modes, shared preamps, unavailable ports and routing',()=>{
 const s=yamahaTestShow('ql1');s.channels.push(channel(4,{bank:'LCL',input:10}));assert.ok(validate(s).some(i=>i.level==='error'&&/occupée/.test(i.text)));s.channels.pop();s.channels[0].bank='A';assert.ok(validate(s).some(i=>i.level==='error'&&/capacité/.test(i.text)));s.channels[0].bank='LCL';s.channels[0].mode='M/S';assert.ok(validate(s).some(i=>/M\/S/.test(i.text)));assert.equal(canRoute(s,'BUS.1','BUS.3'),false);assert.equal(canRoute(s,'CH.1','MTX.1'),true);assert.equal(canRoute(s,'MAIN.1','MTX.1'),true);
});
test('Dante plans separate physical Rio ports, console receive channels and processing channels',()=>{
 const s=yamahaTestShow('dm7');s.stageboxes[0].inputStart=33;s.stageboxes[0].outputStart=17;const flat=flattenYamahaPatch(s);assert.equal(flat.channels[1].input,39);assert.equal(flat.channels[1].bank,'DANTE');assert.equal(flat.channels[1].preparedGain,20);assert.equal(flat.channels[1].gain,0);assert.equal(flat.outputs[0].port,17);assert.equal(flat.outputs[0].bank,'DANTE');assert.equal(s.channels[1].bank,'SB:rio1');assert.ok(yamahaConnectionPlan(s).includes('"7";"39";"CH 3"'));
 const raw=channel(7,{bank:'DANTE',input:39,gain:0,phantom:true});s.channels.push(raw);assert.ok(validate(s).some(i=>/source partagée|préampli externe/.test(i.text)));
});
test('stagebox ranges, Unit IDs, clock compatibility and DM3 Auto Setup are checked',()=>{
 const s=yamahaTestShow('dm7');s.stageboxes.push({...s.stageboxes[0],id:'rio2'});assert.ok(validateStageboxes(s,144).some(i=>i.level==='error'&&/dupliqué|Deux/.test(i.text)));s.stageboxes.pop();s.sampleRate=96;s.stageboxes[0].model='tio1608d';assert.ok(validateStageboxes(s,144).some(i=>/48 kHz/.test(i.text)));s.model='dm3';s.sampleRate=48;s.danteMode='auto';assert.deepEqual(validateStageboxes(s,16).filter(i=>i.level==='error'),[]);s.stageboxes[0].unitId=2;assert.ok(validateStageboxes(s,16).some(i=>/Auto Setup/.test(i.text)));
});
test('Yamaha rider append preserves the configured stagebox and free ports',()=>{
 const s=yamahaTestShow('dm7'),c=channel(1,{name:'Guest',bank:'A',input:1,reviewed:false,importMeta:{bankExplicit:false,portExplicit:false,logicalExplicit:false}}),p=planRiderImport(s,{channels:[c],outputs:[],raw:'Guest'},{target:'append',bank:'SB:rio1',free:true});assert.deepEqual(p.errors,[]);assert.equal(p.show.channels.at(-1).bank,'SB:rio1');assert.equal(p.show.stageboxes[0].id,'rio1');
});
test('CL/QL containers round-trip and exports have valid checksums and stored scene 001',async()=>{
 for(const model of ids.filter(m=>/^(cl|ql)/.test(m))){const base=template(model);assert.deepEqual(Buffer.from(writeCLF(parseCLF(base))),base);const s=yamahaTestShow(model),out=await exportYamahaScene(s,base),current=mem(out),stored=mem(out,1);checkSum(current);checkSum(stored);assert.deepEqual(current,stored);assert.equal(current[28971],67);assert.equal(current[28973],7);assert.equal(current[28810],1);assert.equal(current[28811],1);assert.equal(current[1282]&3,3);assert.equal(current[19166]&3,3);assert.equal(new DataView(current.buffer,current.byteOffset).getUint16(clOutputOffset('DANTE',1)),1);assert.equal(new DataView(current.buffer,current.byteOffset).getUint16(20096),yamahaFader(-15));assert.equal(new DataView(current.buffer,current.byteOffset).getUint16(21290),yamahaFader(-10));assert.deepEqual(base,template(model),'template remains untouched');}
});
test('DM scenes preserve names, patch, stereo links, groups, headamps, buses and virtual mounts',async()=>{
 for(const model of ids.filter(m=>m.startsWith('dm'))){const s=yamahaTestShow(model),out=await exportYamahaScene(s,template(model)),m=parseMBDF(out),r=m.records.find(r=>r.group==='Current'&&!r.name.endsWith('.old')),cur=sections(await readEntry(r)),dm3=model.startsWith('dm3');assert.equal(cur.Mixing.get('InputChannel[0]/Label/Name'),'VOCAL');assert.equal(cur.Mixing.get('InputChannel[0]/Fader/On'),0);assert.equal(cur.Mixing.get('InputChannel[0]/Fader/Level'),-500);assert.equal(cur.Mixing.get('InputChannel[2]/ChannelLink/GroupId'),1);assert.equal(cur.Mixing.get('InputChannel[3]/ChannelLink/GroupId'),1);assert.equal(cur.Mixing.get('InputChannel[0]/ToMix[0]/Level'),-1200);assert.equal(cur.Mixing.get('Mix[0]/ToMatrix[0]/Level'),-1500);assert.equal(cur.Mixing.get('Stereo[0]/ToMatrix[0]/Level'),-1000);assert.equal(cur.Processing.get(`${dm3?'BuiltIn':'Omni'}/InputPort[2]/HeadAmp/Gain`),3000);const list=m.records.find(r=>r.group==='SceneList'),ls=sections(await readEntry(list)).SceneList,filename=ls.get('Bank[0]/Info[0]/FileName');assert.ok(m.records.some(r=>r.name===filename&&r.group===(dm3?'Scene:A':'Scn/UserA')));const info=sections(m).ProjectInfo;assert.equal(info.get('Info/ProductSubName'),model==='dm3s'?'DM3':model.toUpperCase());assert.equal(nativeExtension(s),dm3?'.dm3f':'.dmxf');if(!dm3){const setup=sections(await readEntry(m.records.find(r=>r.group==='Setup'&&!r.name.endsWith('.old')))).Setup;assert.equal(setup.get('DanteNetwork/Config/NetworkFs'),48000);assert.equal(setup.get('DanteRemoteControl/IOUnit[0]/ModelName'),'Rio1608-D2');assert.equal(cur.Mixing.get('DanteRemoteControl/IOUnit[0]/InputPort[6]/HeadAmp/Gain'),2000);assert.equal(cur.Mixing.get('InputChannel[0]/DCA/Assign',consoleProfile(s).dca-1),1);assert.equal(cur.Mixing.get('InputChannel[0]/MuteGroup/Assign',consoleProfile(s).mute-1),1);}}
});
test('Yamaha Main assignment is post-fader at unity and paired matrices have one destination',()=>{
 const s=yamahaTestShow('dm7');setSend(s,'CH.1','MAIN.1',{on:true,level:-12,tap:'PRE'});assert.deepEqual(s.channels[0].mainSends[1],{on:true,level:0,tap:'POST'});s.mixes=[{id:'m',name:'ST MTX',source:'MTX',bus:1,mode:'ST',fader:-144,mute:true}];assert.ok(!getMixes(s).some(m=>m.source==='MTX'&&m.bus===2));
});
test('Yamaha physical stereo pairs can start on an even port and preserve independent Dante addresses',()=>{
 const s=yamahaTestShow('dm3');s.channels[1].input=2;s.channels[1].gain=-6;
 assert.deepEqual(validate(s).filter(i=>i.level==='error'),[]);
 const p=planRenumber(s,'inputs',{target:'patch',scope:'from',from:3,start:4,bank:'SB:rio1',toBank:'SB:rio1'});
 assert.equal(p.show.channels[1].input,4);
 assert.throws(()=>setSend(s,'CH.1','MTX.1',{on:true,level:0,tap:'GRP'}),/Groupe/);
 setAssignment(s,'BUS.1','mute',1,true);assert.ok(validate(s).some(i=>/mute groups concernent/.test(i.text)));
});
test('native CL contract retains stereo send pan, output group masks, master state and DCA counts',async()=>{
 const s=yamahaTestShow('cl5');s.mixes=[{id:'m',name:'ST MTX',source:'MTX',bus:1,mode:'ST',fader:-3,mute:false}];
 setAssignment(s,'BUS.1','dca',1,true);setAssignment(s,'MTX.1','mute',2,true);setAssignment(s,'MAIN.1','dca',2,true);s.groups.mute[1].mute=true;
 const b=mem(await exportYamahaScene(s,template('cl5')));
 // Locations measured by individual edits and saves in QL Editor 5.8.1.
 assert.equal(b[15634],193);assert.equal(b[15635],63);assert.equal(b[18550],193);assert.equal(b[18551],63);
 assert.equal(b[20681]&3,3);assert.equal(b[21105]&3,3);assert.equal(b[21374]&3,3);assert.equal(b[1264]&2,2);
 assert.equal(b[21490+15],1);assert.equal(b[21506],2);assert.equal(b[21507],2);checkSum(b);
});
test('DM export copies the source container and uses the observed native AES source code',async()=>{
 const s=yamahaTestShow('dm7');s.channels[0].bank='AES';s.channels[0].input=1;s.channels[0].gain=0;s.channels[0].phantom=false;
 const base=template('dm7'),before=Buffer.from(base),out=await exportYamahaScene(s,base),m=parseMBDF(out),cur=sections(await readEntry(m.records.find(r=>r.group==='Current'&&!r.name.endsWith('.old'))));
 assert.equal(cur.Mixing.get('InputChannel[0]/InPatch/Bank[0]/Source'),0x01601000);assert.deepEqual(base,before);
 assert.throws(()=>parseMBDF(out.subarray(0,100)),/incompl|invalide|prise en charge/);
});
test('each Yamaha model exports its last processing channel, MIX, matrix and physical Dante port',async()=>{
 for(const model of ids){
  const s=newShow('Capacity');s.model=model;const p=consoleProfile(s),bank=ioCapacity('DANTE',s)?'DANTE':'LCL',port=ioCapacity(bank,s,true);
  s.channels=[channel(p.channels,{name:'LAST',bank:'LCL',input:1,fader:-4,sends:{[p.buses]:{on:true,level:-9,tap:'POST'}},matrixSends:{[p.matrices]:{on:true,level:-8,tap:'PRE'}}})];
  s.outputs=[{id:'last',name:'LASTBUS',source:'BUS',bus:p.buses,mode:'M',bank,port,fader:-7,mute:true}];
  const out=await exportYamahaScene(s,template(model));
  if(model.startsWith('dm')){const m=parseMBDF(out),c=sections(await readEntry(m.records.find(r=>r.group==='Current'&&!r.name.endsWith('.old'))));assert.equal(c.Mixing.get(`InputChannel[${p.channels-1}]/Label/Name`),'LAST');assert.equal(c.Mixing.get(`InputChannel[${p.channels-1}]/ToMix[${p.buses-1}]/Level`),-900);assert.equal(c.Mixing.get(`InputChannel[${p.channels-1}]/ToMatrix[${p.matrices-1}]/Level`),-800);assert.ok(c.Processing.get(`${bank==='DANTE'?'Dante':'Omni'}/OutputPort[${port-1}]/Patch/Source`));}
  else{const b=mem(out),v=new DataView(b.buffer,b.byteOffset);assert.equal(v.getUint16(10472+(p.buses-1)*216+(p.channels-1)*2),yamahaFader(-9));assert.equal(v.getUint16(16844+(p.matrices-1)*216+(p.channels-1)*2),yamahaFader(-8));assert.equal(v.getUint16(clOutputOffset(bank,port)),p.buses);}
 }
});

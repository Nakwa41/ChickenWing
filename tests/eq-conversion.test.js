import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {importSnapshot,validate} from '../src/core.js';
import {CONSOLES,consoleModel,isYamaha} from '../src/consoles.js';
import {planShowConversion} from '../src/show-converter.js';
import {matchEffect} from '../src/fx-equivalence.js';
import {exportYamahaScene} from '../src/yamaha.js';
import {importCL,importDM} from '../src/scene-import.js';
import {parseCLF,clfMemory} from '../src/yamaha-cl.js';
import {parseMBDF,readEntry,sections} from '../src/yamaha-binary.js';
import {yamahaFxUsed} from '../src/yamaha-effects.js';
const base=model=>{const m=consoleModel(model),f=m.dm||m.family;return fs.readFileSync(new URL(`../public/yamaha/${f}${m.dm?(f==='dm3'?'.dm3f':'.dmxf'):'.CLF'}`,import.meta.url));};
function source(){const snap=JSON.parse(fs.readFileSync(new URL('../public/default.snap',import.meta.url)));snap.ae_data.ch[1].name='Soul Voice';snap.ae_data.ch[1].in.conn={grp:'LCL',in:1};snap.ae_data.ch[1].eq={on:true,mdl:'SOUL',mix:100};snap.ae_data.main[1].postins={on:true,ins:'FX9'};snap.ae_data.fx[9]={mdl:'GEQ',fxmix:100};const s=importSnapshot(snap);s.model='compact';return s;}
test('Soul in the WING channel EQ and racked GEQ both receive Yamaha replacements',async()=>{
 for(const model of Object.keys(CONSOLES).filter(isYamaha)){
  const s=source(),before=structuredClone(s),p=planShowConversion(s,model);assert.deepEqual(p.errors,[],model);assert.deepEqual(s,before);
  assert.equal(p.report.effects.length,2,model);assert.ok(p.report.effects.every(r=>r.to&&r.allocation),model);
  const soul=p.report.effects.find(r=>r.from.id==='SOUL'),geq=p.report.effects.find(r=>r.from.id==='GEQ');assert.equal(soul.to.kind,'peq');assert.equal(geq.to.kind,'geq');assert.match(soul.reason,/Q dépendant du gain/);
  assert.equal(soul.to.id,consoleModel(model).dm==='dm3'?'CHANNEL_PEQ':consoleModel(model).dm==='dm5'?'8BandPEQ':consoleModel(model).dm==='dm7'?'Equalizer601':'EQUALIZER601');
  assert.equal(geq.to.rack,consoleModel(model).dm==='dm3'?'channel':'eq');
  const native=await exportYamahaScene(p.show,base(model));if(consoleModel(model).dm!=='dm3'){const round=consoleModel(model).dm?await importDM(native,model):importCL(native,model);assert.equal(round.fx.length,2,model);assert.equal(round.fx.find(f=>f.model.startsWith('31BandGEQ')).model,'31BandGEQ St',model);}
 }
});
test('GEQ names resolve to functions and a DM3 input uses PEQ rather than an unavailable output GEQ',()=>{
 for(const name of ['GEQ','Graphic EQ','EQ'])assert.equal(matchEffect('wing','dm7',{model:name,target:'MAIN'},{stereo:true}).to.id,'31BandGEQ St');
 const p=matchEffect('wing','dm3',{model:'GEQ',target:'CH'});assert.equal(p.to.id,'CHANNEL_PEQ');assert.equal(p.status,'approximate');
 assert.equal(matchEffect('wing','cl5',{model:'GEQ',target:'CH'}).to.id,'EQUALIZER601');
 assert.equal(matchEffect('wing',{model:'dm5',pyDsp:true},{model:'Soul Analog EQ'}).to.id,'Equalizer601');
});
test('dedicated GEQ costs, patch and physical gains survive native DM and CL exports',async()=>{
 for(const model of ['dm7','dm5','cl5','ql5']){
  const p=planShowConversion(source(),model),geq=p.show.fx.find(f=>f.model.startsWith('31BandGEQ'));geq.eqBands=Array.from({length:31},(_,n)=>n===0?-3:n===12?4.5:0);assert.equal(yamahaFxUsed(p.show,'eq'),consoleModel(model).dm==='dm5'?3:2);assert.deepEqual(validate(p.show).filter(x=>x.level==='error'),[]);
  const bytes=await exportYamahaScene(p.show,base(model)),read=consoleModel(model).dm?await importDM(bytes,model):importCL(bytes,model),round=read.fx.find(f=>f.model.startsWith('31BandGEQ'));assert.deepEqual(round.eqBands,geq.eqBands);assert.equal(round.target,'MAIN');
  if(consoleModel(model).dm){const m=parseMBDF(bytes),mix=sections(await readEntry(m.records.find(r=>r.group==='Current'&&!r.name.endsWith('.old')))).Mixing;assert.equal(mix.get(`GEQRack2[${geq.slot-1}]/Type`),'31BandGEQ');assert.equal(mix.get(`GEQRack2[${geq.slot}]/Type`),'31BandGEQ');assert.equal(mix.get('Stereo[0]/Insert/Module[0]/Patch/Source'),0x06800000+(geq.slot-1)*16);assert.equal(mix.get('Stereo[1]/Insert/Module[0]/Patch/Source'),0x06800000+geq.slot*16);}
  else{const mem=clfMemory(parseCLF(bytes).children.find(c=>c.id===16).node.children.find(c=>c.id===65534).node);assert.equal(mem[29195],155);assert.equal(mem[29196],157);}
 }
});
test('DM3 GEQ warns about its 15 active bands and exports its real output module',async()=>{
 const p=planShowConversion(source(),'dm3'),f=p.show.fx.find(f=>f.model==='OUTPUT_GEQ');f.eqBands=Array(31).fill(1);assert.ok(validate(p.show).some(x=>/15 bandes/.test(x.text)));f.eqBands=Array.from({length:31},(_,n)=>n===8?-5:0);const read=await importDM(await exportYamahaScene(p.show,base('dm3')),'dm3');assert.deepEqual(read.fx.find(f=>f.model==='OUTPUT_GEQ').eqBands,f.eqBands);
});
test('Soul and GEQ on the same WING Main fit Yamaha’s shared insertion point with an explicit adaptation',()=>{
 const s=source();s.template.ae_data.ch[1].eq.on=false;s.template.ae_data.ch[1].eq.mdl='STD';s.template.ae_data.main[1].eq={on:true,mdl:'SOUL',mix:100};
 const p=planShowConversion(s,'dm7');assert.deepEqual(p.errors,[]);assert.equal(p.show.fx.length,2);assert.ok(p.show.fx.every(f=>f.target==='MAIN'&&f.targetN===1));assert.deepEqual(p.show.fx.map(f=>f.insertSlot),[1,2]);assert.equal(p.show.fx[0].position,p.show.fx[1].position);assert.match(p.warnings.map(w=>w.text).join('\n'),/point commun des inserts/);
});
test('a bypassed modelled WING channel EQ is identified and keeps its bypass',()=>{
 const s=source();s.template.ae_data.ch[1].eq.on=false;const p=planShowConversion(s,'dm7');assert.deepEqual(p.errors,[]);assert.equal(p.report.effects.filter(r=>r.from.id==='SOUL').length,1);assert.equal(p.show.fx.find(f=>f.model==='Equalizer601').bypass,true);
});
test('CL Flex15 and 8BandPEQ are identified rather than misread as 31-band GEQ',async()=>{
 const {writeCLF,fixCLChecksum}=await import('../src/yamaha-cl.js');
 for(const [type,model,kind] of [[2,'Flex15GEQ','geq'],[4,'8BandPEQ','peq']]){
  const p=planShowConversion(source(),'cl5'),tree=parseCLF(await exportYamahaScene(p.show,base('cl5')));
  for(const c of tree.children.find(c=>c.id===16).node.children.filter(c=>c.id===65534)){const mem=clfMemory(c.node);mem[21684]=type;mem[21685]=0;mem[29196]=156;mem[21755]|=1;fixCLChecksum(mem);}
  const read=importCL(writeCLF(tree),'cl5'),eq=read.fx.find(f=>f.model===model);assert.ok(eq,model);assert.equal(eq.eqBands,undefined);const conversion=planShowConversion(read,'dm7');assert.deepEqual(conversion.errors,[]);assert.equal(conversion.report.effects.find(r=>r.id===eq.id).to.kind,kind);
 }
});

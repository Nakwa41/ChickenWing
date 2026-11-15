import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CONSOLES,pairedStereo,consoleModel,consoleProfile} from '../src/consoles.js';
import {newShow,channel,validate} from '../src/core.js';
import {makeMix} from '../src/routing.js';
import {initializeGroups,setAssignment,getAssignment} from '../src/groups.js';
import {planInsert} from '../src/patch.js';
import {exportYamahaScene} from '../src/yamaha.js';
import {parseCLF,clfMemory} from '../src/yamaha-cl.js';
import {premiumTestShow} from './fixtures/yamaha-fx-shows.js';

const errors=s=>validate(s).filter(i=>i.level==='error');
const output=(source,bus,mode,name,port)=>({...makeMix(source,bus,{mode,name,type:'IEM'}),bank:'LCL',port});
const insert=(s,n=1,port=1)=>planInsert(s,'outputs',{n,port,name:'FX Retour',type:'FX',mode:'M',source:'BUS',bank:'LCL',shiftNumbers:true,shiftPatch:false});
function show(model){const s=newShow('Insertion FX');s.model=model;s.channels=[channel(1,{bank:'LCL',input:1})];s.outputs=[output('BUS',3,'ST','IEM 1',7)];s.mixes=[makeMix('BUS',1,{mode:'M'})];return s;}

test('FX insertion on physical outputs 1–6 preserves stereo buses on every supported console',()=>{
 for(const model of Object.keys(CONSOLES))for(let port=1;port<=6;port++){
  const s=show(model),before=JSON.stringify(s),{show:next,createdId}=insert(s,1,port),fx=next.outputs.find(o=>o.id===createdId),iem=next.outputs.find(o=>o.name==='IEM 1');
  assert.equal(JSON.stringify(s),before);assert.deepEqual(errors(next),[],model+' port '+port);
  assert.deepEqual([fx.name,fx.type,fx.mode,fx.bus,fx.port],['FX Retour','FX','M',1,port]);
  assert.deepEqual([iem.type,iem.mode,iem.bus,iem.port],['IEM','ST',pairedStereo(s)?5:4,7]);
 }
});

test('CL5 insertion before buses 1–6 keeps an existing IEM 7–8 linked and its physical patch intact',()=>{
 for(let n=1;n<=6;n++){
  const s=show('cl5');s.outputs[0].bus=7;s.mixes=Array.from({length:6},(_,i)=>makeMix('BUS',i+1,{mode:'M'}));
  const p=insert(s,n,n),iem=p.show.outputs.find(o=>o.name==='IEM 1');
  assert.equal(iem.bus,9);assert.equal(iem.port,7);assert.deepEqual(errors(p.show),[]);
  assert.ok(p.changes.some(c=>c.name==='IEM 1'&&c.before==='BUS 7 · LCL.7–8'&&c.after==='BUS 9 · LCL.7–8'));
 }
});

test('alignment propagates through a following mono bus and another stereo pair without collisions',()=>{
 for(const model of ['cl5','dm7','m32','m32r','wing','compact','rack']){
  const s=show(model);s.mixes.push(makeMix('BUS',5,{mode:'M',name:'NEXT MONO'}),makeMix('BUS',7,{mode:'ST',name:'NEXT ST'}));
  s.channels[0].sends={3:{on:true,level:-9,tap:'PRE'},5:{on:true,level:-13,tap:'PRE'},7:{on:true,level:-19,tap:'PRE'}};
  initializeGroups(s);setAssignment(s,'BUS.3','dca',1,true);
  const next=insert(s).show,paired=pairedStereo(s),[iem,mono,st]=[next.outputs.find(o=>o.name==='IEM 1'),next.mixes.find(o=>o.name==='NEXT MONO'),next.mixes.find(o=>o.name==='NEXT ST')];
  assert.deepEqual([iem.bus,mono.bus,st.bus],paired?[5,7,9]:[4,6,8]);assert.deepEqual(errors(next),[],model);
  assert.equal(next.channels[0].sends[iem.bus].level,-9);assert.equal(next.channels[0].sends[mono.bus].level,-13);assert.equal(next.channels[0].sends[st.bus].level,-19);
  assert.deepEqual(getAssignment(next,'BUS.'+iem.bus).dcas,[1]);assert.deepEqual(getAssignment(next,'BUS.3').dcas,[]);
 }
});

test('mono channel insertion also preserves linked input pairs and DM FX return pairs',()=>{
 for(const model of Object.keys(CONSOLES).filter(pairedStereo)){
  const s=newShow();s.model=model;s.channels=[channel(1,{bank:'LCL',input:1}),channel(3,{bank:'LCL',input:3,mode:'ST'}),channel(5,{bank:'LCL',input:5})];
  const next=planInsert(s,'inputs',{n:1,port:7,bank:'LCL',name:'Guest',mode:'M',shiftNumbers:true}).show;
  assert.deepEqual(next.channels.map(c=>c.n),[1,2,5,7],model);assert.deepEqual(errors(next),[],model);
 }
 const s=premiumTestShow('dm7'),next=planInsert(s,'inputs',{n:1,port:2,bank:'LCL',name:'Guest',mode:'M',shiftNumbers:true}).show;
 assert.deepEqual(next.fx.filter(f=>f.usage==='send').map(f=>f.returnN),[7,9,11]);assert.deepEqual(errors(next),[]);
});

test('Yamaha exports after insertion preserve FX sends, stereo insert sides, Dual destinations and group assignments',async()=>{
 for(const model of Object.keys(CONSOLES).filter(m=>consoleModel(m).brand==='yamaha')){
  const s=premiumTestShow(model),before=JSON.stringify(s),next=insert(s,1,3).show;
  assert.equal(JSON.stringify(s),before);assert.deepEqual(errors(next),[],model);
  const insertFx=next.fx.find(f=>f.id==='bus-insert');if(insertFx)assert.equal(insertFx.targetN,3);
  const dual=next.fx.find(f=>f.id==='pr-dual');if(dual)assert.equal(dual.rightTarget,'BUS.7');
  if(consoleModel(s).dm!=='dm3'){assert.equal(next.fx[0].sendLeft,3);assert.equal(next.fx[0].sendRight,4);assert.equal(next.fx[1].sendLeft,5);assert.equal(next.fx[1].sendRight,6);}
  assert.equal(next.channels[0].sends[3].level,-12);
  const family=consoleModel(s).dm||consoleModel(s).family,ext=family==='dm3'?'.dm3f':family.startsWith('dm')?'.dmxf':'.CLF',out=await exportYamahaScene(next,fs.readFileSync(`public/yamaha/${family}${ext}`));
  assert.ok(out.length>1000);
  if(!consoleModel(s).dm){const m=clfMemory(parseCLF(out).children.find(c=>c.id===16).node.children.find(c=>c.id===65534).node),v=new DataView(m.buffer,m.byteOffset);assert.equal(v.getUint16(30532),3);assert.equal(v.getUint16(30548),4);assert.equal(v.getUint16(30536),119);assert.equal(v.getUint16(30552),120);assert.equal(m[29163+2],127);assert.equal(m[29163+3],128);}
 }
});

test('alignment overflow and insertion inside an existing pair remain atomic errors',()=>{
 for(const model of Object.keys(CONSOLES).filter(pairedStereo)){
  const s=show(model);s.outputs[0].bus=consoleProfile(s).buses-1;const before=JSON.stringify(s);assert.throws(()=>insert(s));assert.equal(JSON.stringify(s),before);
  s.outputs[0].bus=3;assert.throws(()=>insert(s,4),/déjà utilisé/);
 }
});

test('Yamaha validation identifies the actual stereo bus and distinguishes its logical number from its physical port',()=>{
 const s=show('cl5');s.outputs[0].name='FX Hall';s.outputs[0].type='FX';s.outputs[0].bus=2;
 assert.match(errors(s)[0].text,/FX Hall \(BUS 2–3\).*numéro logique impair.*physique/);
 s.outputs[0].bus=3;s.outputs[0].port=2;assert.deepEqual(errors(s),[]);
 s.outputs[0].name='';assert.match(errors(s)[0].text,/BUS 3 : le nom du bus est vide/);
});

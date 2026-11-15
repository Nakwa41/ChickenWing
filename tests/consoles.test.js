import test from 'node:test';
import assert from 'node:assert/strict';
import {CONSOLE_CATALOG,CONSOLES,consoleModel,consoleBrands,consoleFamilies,consoleOptions,consoleProfile,isM32,ioCapacity,bankOptions,mainOutputPort} from '../src/consoles.js';
import {newShow,channel,validate,assertProject,exportSnapshot} from '../src/core.js';
import {createWizardShow} from '../src/show-builder.js';
import {exportM32Scene,parseM32Scene} from '../src/m32.js';
import {initializeGroups} from '../src/groups.js';

test('every console belongs to one brand and family, with dependent choices',()=>{
 const ids=CONSOLE_CATALOG.flatMap(b=>b.families.flatMap(f=>f.models.map(m=>m.id)));
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(consoleBrands(),[['behringer','Behringer'],['midas','Midas'],['yamaha','Yamaha']]);
 assert.deepEqual(consoleOptions('behringer','wing').map(([id])=>id),['wing','compact','rack']);
 assert.deepEqual(consoleOptions('midas','m32').map(([id])=>id),['m32','m32r']);
 assert.deepEqual(consoleFamilies('behringer'),[['wing','WING']]);
 assert.deepEqual(consoleFamilies('midas'),[['m32','M32']]);
 assert.deepEqual(consoleOptions('behringer','m32'),[]);
 assert.deepEqual(consoleOptions('midas','wing'),[]);
 assert.deepEqual(consoleFamilies('unknown'),[]);
 assert.deepEqual(consoleOptions('unknown','unknown'),[]);
 for(const brand of CONSOLE_CATALOG)for(const family of brand.families)for(const model of family.models){
  assert.equal(consoleModel({model:model.id}).brand,brand.id);
  assert.equal(consoleModel(model.id).family,family.id);
  assert.equal(consoleModel(model.id).engine,family.engine);
  assert.equal(consoleProfile(model.id).name,CONSOLES[model.id]);
 }
});

test('legacy project model IDs and labels remain valid without storing a brand',()=>{
 for(const [model,label]of Object.entries({wing:'WING',compact:'WING COMPACT',rack:'WING RACK',m32:'Midas M32'})){
  const s=newShow();s.model=model;
  const restored=assertProject(JSON.parse(JSON.stringify(s)));
  assert.equal(restored.model,model);assert.equal(CONSOLES[model],label);
  assert.equal(restored.consoleBrand,undefined);
 }
 assert.equal(consoleModel(newShow()).id,'wing');
 assert.equal(consoleModel({}).id,'wing');
});

test('M32R shares M32 processing while respecting its physical connectors',()=>{
 assert.equal(isM32('m32r'),true);assert.equal(isM32({model:'m32r'}),true);
 assert.equal(consoleProfile('m32r').channels,32);assert.equal(consoleProfile('m32r').fx,8);
 assert.equal(ioCapacity('LCL','m32r'),16);assert.equal(ioCapacity('LCL','m32r',true),8);
 assert.equal(ioCapacity('A','m32r'),48);assert.equal(ioCapacity('USB','m32r'),32);
 assert.equal(ioCapacity('AES','m32r',true),0);
 assert.ok(!bankOptions('m32r',true).some(([bank])=>bank==='AES'));
 assert.equal(mainOutputPort('m32r'),7);assert.equal(mainOutputPort('m32'),15);
 assert.equal(mainOutputPort('wing'),7);
});

test('M32R wizard, project restore and scene export preserve the model and Main LR on Local 7–8',()=>{
 const s=createWizardShow({name:'Compact show',model:'m32r',preset:'empty',count:16,bank:'LCL',outBank:'A',wedges:1,iems:1,groups:0,fxBuses:0,extraBuses:0,mainLR:true});
 initializeGroups(s);
 assert.equal(s.outputs.find(o=>o.source==='MAIN').port,7);
 assert.equal(s.groups.dca.length,8);assert.equal(s.groups.mute.length,6);
 assert.deepEqual(validate(s).filter(i=>i.level==='error'),[]);
 const restored=assertProject(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.model,'m32r');
 const nodes=parseM32Scene(exportM32Scene(restored));
 assert.equal(nodes.get('/config/userrout/in').split(' ')[15],'16');
 const route=nodes.get('/config/routing/OUT').split(' '),start=Number(route[1].match(/UOUT(\d+)/)[1]);
 for(const [side,code]of [[0,'1'],[1,'2']]){
  const index=Number(nodes.get('/config/userrout/out').split(' ')[start-1+2+side])-168;
  assert.equal(nodes.get(`/outputs/main/${String(index).padStart(2,'0')}`).split(' ')[0],code);
 }
 assert.throws(()=>exportSnapshot(s,{}),/scn/);
});

test('M32R refuses nonexistent local ports and unavailable M32 processing modes',()=>{
 const s=newShow();s.model='m32r';s.channels=[channel(1,{bank:'LCL',input:16})];
 assert.deepEqual(validate(s).filter(i=>i.level==='error'),[]);
 s.channels[0].input=17;assert.throws(()=>exportM32Scene(s),/capacité/);
 s.channels[0].input=16;s.channels[0].mode='M/S';assert.throws(()=>exportM32Scene(s),/M\/S/);
 s.channels[0].mode='M';s.outputs=[{id:'out',name:'Invalid',source:'BUS',bus:1,bank:'LCL',port:9,mode:'M',mute:true,fader:-144,tap:'POST'}];
 assert.throws(()=>exportM32Scene(s),/indisponible/);
 s.outputs[0].bank='AES';s.outputs[0].port=1;assert.throws(()=>exportM32Scene(s),/indisponible/);
});

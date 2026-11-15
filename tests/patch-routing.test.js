import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {channel,newShow,demoShow,exportSnapshot,importSnapshot} from '../src/core.js';
import {planInsert,planRenumber} from '../src/patch.js';
import {makeMix,getMixes,setSend,getSend} from '../src/routing.js';
import {FX_CATALOG,effectAllowed} from '../src/effects.js';
const baseline=JSON.parse(fs.readFileSync(new URL('../public/default.snap',import.meta.url)));
test('demo metadata matches the requested performance',()=>{const s=demoShow();assert.equal(s.name,'Sourd Agency - Live Session');assert.equal(s.artist,'Michel Jason');assert.equal(s.date,'2012-12-13');assert.equal(s.venue,'Dans la haie - Blois');});
test('input insertion shifts logical positions, stereo physical pairs, and FX targets',()=>{
 const s=newShow();s.channels=[channel(1,{input:1}),channel(2,{mode:'ST',input:3}),channel(3,{input:5})];s.fx=[{id:'fx',slot:1,target:'CH',targetN:2,position:'postins',model:'GEQ',mix:100}];
 const before=JSON.stringify(s);const plan=planInsert(s,'inputs',{n:2,name:'New',bank:'A',port:3,mode:'M',shiftNumbers:true,shiftPatch:true});assert.equal(JSON.stringify(s),before);
 const next=plan.show;assert.deepEqual(next.channels.map(c=>[c.n,c.input]),[[1,1],[2,3],[3,5],[4,7]]);assert.equal(next.fx[0].targetN,3);
});
test('logical insertion without requested shifts reports collisions and leaves the show unchanged',()=>{const s=demoShow(),before=JSON.stringify(s);assert.throws(()=>planInsert(s,'inputs',{n:3,name:'New',bank:'B',port:1,mode:'M'}),/occupée/);assert.equal(JSON.stringify(s),before);});
test('renumber only the selected tail and preserve imported channel processing',()=>{
 const source=exportSnapshot(demoShow(),baseline);source.ae_data.ch['2'].eq['1g']=7;
 const s=importSnapshot(source);const next=planRenumber(s,'inputs',{target:'numbers',scope:'from',from:2,start:3}).show;
 assert.equal(next.channels[0].n,1);assert.equal(next.channels[1].n,3);
 const result=exportSnapshot(next,baseline);assert.equal(result.ae_data.ch['3'].eq['1g'],7);assert.equal(result.ae_data.ch['2'].in.conn.grp,'OFF');
});
test('physical renumbering follows stereo width and changes only the selected interface',()=>{
 const s=newShow();s.channels=[channel(1,{bank:'A',input:1}),channel(2,{bank:'A',input:3,mode:'ST'}),channel(3,{bank:'B',input:1})];
 const next=planRenumber(s,'inputs',{target:'patch',scope:'all',start:2,bank:'A',toBank:'C'}).show;
 assert.deepEqual(next.channels.map(c=>[c.bank,c.input]),[['C',2],['C',3],['B',1]]);
});
test('capacity failures and collisions never return a partially modified patch',()=>{const s=demoShow(),before=JSON.stringify(s);assert.throws(()=>planRenumber(s,'inputs',{target:'patch',scope:'all',start:20,bank:'*',toBank:'LCL'}));assert.equal(JSON.stringify(s),before);assert.throws(()=>planRenumber(s,'inputs',{target:'numbers',scope:'from',from:10,start:1}));});
test('output insertion shifts bus numbering, physical destinations, channel sends, and FX',()=>{
 const s=newShow();s.channels=[channel(1,{sends:{2:{on:true,level:-9,tap:'PRE'}}})];s.outputs=[{...makeMix('BUS',1,{mode:'M'}),bank:'A',port:1},{...makeMix('BUS',2,{mode:'ST'}),bank:'A',port:2}];s.fx=[{id:'fx',slot:1,target:'BUS',targetN:2,position:'postins',model:'GEQ',mix:100}];
 const next=planInsert(s,'outputs',{n:2,name:'Extra',bank:'A',port:2,mode:'M',source:'BUS',shiftNumbers:true,shiftPatch:true}).show;
 assert.equal(next.channels[0].sends[3].level,-9);assert.equal(next.fx[0].targetN,3);assert.deepEqual(next.outputs.map(o=>[o.bus,o.port]),[[1,1],[2,2],[3,3]]);
 const ae=exportSnapshot(next,baseline).ae_data;assert.deepEqual(ae.io.out.A['3'],{grp:'BUS',in:5});assert.deepEqual(ae.io.out.A['4'],{grp:'BUS',in:6});
});
test('renumbering all configured buses updates internal FX bus targets too',()=>{const s=demoShow();setSend(s,'CH.1','BUS.15',{on:true,level:-15,tap:'POST'});const next=planRenumber(s,'outputs',{target:'numbers',scope:'all',start:1,source:'BUS'}).show;assert.equal(next.fx[0].targetN,6);assert.equal(next.channels[0].sends[6].level,-15);assert.equal(next.channels[0].sends[15],undefined);});
test('internal group sends, bus-to-bus sends, and all four Mains export to their actual WING nodes',()=>{
 const s=newShow();s.channels=[channel(1)];s.mixes=[makeMix('BUS',3,{name:'Batterie'}),makeMix('BUS',4,{name:'FX'})];
 setSend(s,'CH.1','BUS.3',{on:true,level:0,tap:'GRP'});setSend(s,'BUS.3','BUS.4',{on:true,level:-12,tap:'PRE'});setSend(s,'BUS.3','MAIN.2',{on:true,level:-3,tap:'POST'});setSend(s,'CH.1','MAIN.4',{on:true,level:-8,tap:'PRE'});
 assert.equal(getMixes(s).filter(m=>m.source==='MAIN').length,4);
 const a=exportSnapshot(s,baseline).ae_data;assert.equal(a.ch['1'].send['3'].mode,'GRP');assert.equal(a.bus['3'].send['4'].pre,true);assert.equal(a.bus['3'].main['2'].lvl,-3);assert.equal(a.ch['1'].main['4'].pre,true);assert.equal(a.io.out.A['3'].grp,'OFF');
 const loaded=importSnapshot(exportSnapshot(s,baseline));assert.equal(getSend(loaded,'BUS.3','MAIN.2').level,-3);
});
test('Main 1 remains synchronized with the existing channel inspector assignment',()=>{const s=newShow();s.channels=[channel(1)];setSend(s,'CH.1','MAIN.1',{on:false,level:-7,tap:'PRE'});assert.equal(s.channels[0].main,false);s.channels[0].main=true;assert.equal(getSend(s,'CH.1','MAIN.1').on,true);assert.equal(exportSnapshot(s,baseline).ae_data.ch['1'].main['1'].lvl,-7);});
test('self sends and unsupported group taps are rejected',()=>{const s=demoShow();assert.throws(()=>setSend(s,'BUS.1','BUS.1',{on:true,level:0,tap:'POST'}));assert.throws(()=>setSend(s,'CH.1','MAIN.1',{on:true,level:0,tap:'GRP'}));});
test('every documented FX model enforces the premium/standard slot rules',()=>{assert.equal(new Set(FX_CATALOG.map(f=>f.id)).size,FX_CATALOG.length);assert.ok(FX_CATALOG.length>=60);for(const f of FX_CATALOG){assert.equal(effectAllowed(f.id,1),true);assert.equal(effectAllowed(f.id,16),!f.premium);}assert.equal(effectAllowed('BPLATE',9),false);assert.equal(effectAllowed('*MASTER*',16),true);assert.equal(effectAllowed('UNKNOWN',1),false);});
test('moving Main 1 keeps its feeds and physical sides while clearing the former assignment',()=>{const s=newShow();s.channels=[channel(1)];s.outputs=[{...makeMix('MAIN',1,{name:'Main LR'}),bank:'LCL',port:7}];setSend(s,'CH.1','MAIN.1',{on:true,level:-4,tap:'PRE'});const next=planRenumber(s,'outputs',{target:'numbers',scope:'all',start:2,source:'MAIN'}).show;const a=exportSnapshot(next,baseline).ae_data;assert.equal(a.ch['1'].main['1'].on,false);assert.equal(a.ch['1'].main['2'].lvl,-4);assert.deepEqual(a.io.out.LCL['7'],{grp:'MAIN',in:3});assert.deepEqual(a.io.out.LCL['8'],{grp:'MAIN',in:4});});
test('moving an imported bus preserves its EQ and does not resurrect its former bus sends',()=>{const s=demoShow();setSend(s,'BUS.1','BUS.2',{on:true,level:-5,tap:'POST'});const native=exportSnapshot(s,baseline);native.ae_data.bus['1'].eq['1g']=4;const imported=importSnapshot(native);const next=planRenumber(imported,'outputs',{target:'numbers',scope:'all',start:2,source:'BUS'}).show;const a=exportSnapshot(next,baseline).ae_data;assert.equal(a.bus['2'].eq['1g'],4);assert.equal(a.bus['2'].send['2'].on,false);assert.equal(a.bus['2'].send['3'].lvl,-5);});
test('an explicitly empty show can export a neutral reset snapshot',()=>{const a=exportSnapshot(newShow('Démo vide'),baseline).ae_data;assert.ok(Object.values(a.ch).every(c=>c.mute&&c.fdr===-144&&c.in.conn.grp==='OFF'));assert.ok(Object.values(a.fx).every(f=>f.mdl==='NONE'));});

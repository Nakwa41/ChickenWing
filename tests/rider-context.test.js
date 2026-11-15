import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseRider,parseRiderDocument,parseBank,inventoryWarnings} from '../src/importer.js';
import {collectAudioContext} from '../src/rider-context.js';
import {newShow,exportSnapshot,assertProject} from '../src/core.js';
import {planRiderImport} from '../src/import-plan.js';
const audio=fs.readFileSync(new URL('./fixtures/rider-theatre-audio.txt',import.meta.url),'utf8');
const doc={filename:'Fiche théâtre.pdf',sections:[
 {id:'page-1',label:'Page 1',text:'CONTACTS\n1 Régisseur général\n2 Responsable de production'},
 {id:'page-2',label:'Page 2',text:audio.split('UNE REGIE FOH')[0]+'\nLUMIÈRE\nCH;Source;Référence\n1;GrandMA3;Console lumière\n2;Machine à brouillard;MDG'},
 {id:'page-3',label:'Page 3',text:'SON\nUNE REGIE FOH'+audio.split('UNE REGIE FOH')[1]+'\nLUMIÈRE\n1 GrandMA3\n2 Ventilateurs\nINTERPHONIE\n1 Régie Son\nPLATEAU\n1 Mange debout'},
 {id:'page-4',label:'Page 4',text:'Plan de Feu\nCH;Source;Référence\n1;Wash;MacAura PXL\n2;Spot;Esprit'}
]};
const prepare=()=>parseRiderDocument(doc);

test('mixed theatre rider selects only the page containing audio patches',()=>{
 const r=prepare();assert.deepEqual(r.selectedIds,['page-3']);assert.deepEqual(r.analysis.map(s=>[s.inputCount,s.outputCount]),[[0,0],[0,0],[12,10],[0,0]]);
 assert.equal(r.channels.length,12);assert.equal(r.outputs.length,10);assert.ok(!/GrandMA|Ventilateur|Régisseur|MacAura|Mange debout|MDG/.test(r.raw));
});
test('RIO ports and local console ports remain distinct despite repeated IN and OUT numbers',()=>{
 const r=prepare();assert.deepEqual(r.channels.map(c=>[c.name,c.bank,c.input]),[['DPA 1','A',1],['DPA 2','A',2],['Main 1','A',3],['Main 2','A',4],['KM184 Jar','A',5],['KM184 Centre','A',6],['KM184 Cour','A',7],['Ordi L','LCL',1],['Ordi R','LCL',2],['Spare L','LCL',3],['Spare R','LCL',4],['TB','LCL',8]]);
 assert.deepEqual(r.outputs.map(o=>[o.bus,o.bank,o.port]),[[1,'A',1],[2,'A',2],[3,'A',3],[4,'A',4],[5,'A',5],[6,'LCL',1],[7,'LCL',2],[8,'LCL',3],[9,'LCL',4],[10,'LCL',5]]);
});
test('audio inventory supplies evidence, never channels, and ambiguous quantities stay visible',()=>{
 const r=prepare();assert.equal(r.channels[0].mic,'DPA 4066');assert.equal(r.channels[2].mic,'Shure Axient AD2 Micro Main caps B58');assert.equal(r.channels[4].mic,'Neumann KM 184');assert.equal(r.channels[11].mic,'Shure SM58');
 assert.deepEqual(r.channels.filter(c=>c.phantom).map(c=>c.name),['KM184 Jar','KM184 Centre','KM184 Cour']);
 assert.ok(r.channels[0].importMeta.micEvidence.includes('1x DPA 4066'));assert.ok(r.warnings.some(w=>w.includes('DPA 4066')&&w.includes('2 entrées actives')));
 assert.equal(r.context.consoles[0].label,'Console Yamaha DM7 / DM7 Compact (pas d’autre console)');
});
test('equipment, contact, lighting and logistics lists cannot become inputs without audio evidence',()=>{
 for(const text of ['1 Régisseur général\n2 Directeur technique','SON\n1x RIO3224-D\n2 x Shure SM58\n3 × KM184','LUMIÈRE\nCH;Source;Micro\n1;Wash;SM58','Plan de Feu\n1 Side light\n2 Spot','LOGISTIQUE\n1 Hôtel\n2 Catering']){
  const r=parseRider(text);assert.equal(r.channels.length,0,text);assert.equal(r.outputs.length,0,text);
 }
});
test('a numbered prose paragraph after a numberless table cannot become a channel',()=>{
 const r=parseRider('Source;Micro\nVoix;SM58\nMerci de prévoir un responsable\nLUMIÈRE\n1 GrandMA2');assert.equal(r.channels.length,1);assert.equal(r.channels[0].name,'Voix');
});
test('horizontal and wrapped patch labels support both directions without swallowing source slashes',()=>{
 const r=parseRider('Patch RIO IN:\nIn1: Keys L/R / In2: Spare\nPatch IN Console: In 8: TB\nPatch OUT RIO: Out1: Side L; Out2: Side R');
 assert.deepEqual(r.channels.map(c=>[c.name,c.input,c.bank]),[['Keys L/R',1,'A'],['Spare',2,'A'],['TB',8,'LCL']]);assert.equal(r.outputs.length,2);
});
test('plain audio lists are retained while unrelated numbered lists remain empty',()=>{
 assert.equal(parseRider('1 Kick In\n2 Snare Top\n3 Bass DI').channels.length,3);assert.equal(parseRider('1 Responsable\n2 Machine de plateau').channels.length,0);
});
test('RIO is configurable as a stagebox, Console remains Local, physical addresses are preserved',()=>{
 const r=prepare(),p=planRiderImport(newShow(),r,{target:'new',name:'Théâtre',model:'wing',bank:'B',outBank:'B'});assert.deepEqual(p.errors,[]);
 assert.equal(p.show.channels.length,12);assert.equal(p.show.channels[0].bank,'B');assert.equal(p.show.channels[7].bank,'LCL');assert.equal(p.show.channels[11].input,8);assert.equal(p.show.outputs[5].bank,'LCL');assert.equal(p.show.outputs[5].bus,6);
 assert.equal(assertProject(p.show).files[0].audioContext.stageboxes[0],'RIO');assert.ok(p.show.notes.includes('DM7'));
 const baseline=JSON.parse(fs.readFileSync(new URL('../public/default.snap',import.meta.url))),snap=exportSnapshot(p.show,baseline);
 assert.equal(snap.ae_data.ch['12'].in.conn.grp,'LCL');assert.equal(snap.ae_data.ch['12'].in.conn.in,8);assert.equal(snap.ae_data.io.in.B['5'].vph,true);
});
test('append assigns logical slots for physical-only patch lines without moving documented ports',()=>{
 const r=prepare(),first=planRiderImport(newShow(),parseRider('CH;Source;Micro;Banque;Entrée\n1;Existing;SM58;USB;1'),{target:'new',name:'Existing',model:'wing'}).show;
 const p=planRiderImport(first,r,{target:'append',bank:'A',outBank:'A',free:false});assert.deepEqual(p.errors,[]);assert.equal(p.show.channels.find(c=>c.name==='DPA 1').n,2);assert.equal(p.show.channels.find(c=>c.name==='TB').input,8);
});
test('ambiguous inventory never selects an arbitrary DPA model',()=>{
 const sections=[{id:'text',label:'Son',text:'SON\n1x DPA 4066\n1x DPA 4088\nPatch RIO IN: In1: DPA 1'}],r=parseRiderDocument({sections});assert.equal(r.channels.length,1);assert.equal(r.channels[0].mic,'');assert.equal(r.channels[0].phantom,false);
});
test('all pages may be selected without admitting lighting into the parsed patch',()=>{
 const r=parseRiderDocument(doc,{selectedIds:doc.sections.map(s=>s.id)});assert.equal(r.channels.length,12);assert.equal(r.outputs.length,10);assert.equal(r.analysis[3].parsed.channels.length,0);
});
test('unsupported source word is not blindly accepted as a bank',()=>{
 assert.equal(parseBank('console'),'LCL');assert.equal(parseBank('RIO'),'A');assert.equal(parseBank('GrandMA3'),null);
});


test('duplicated PDF heading glyphs and repeated whole titles stop audio parsing and raw excerpts',()=>{
 for(const heading of ['LUMIÈRELUMIÈRE','LLUUMMIIEERREE','LUMIÈRE','INTERPHONIEINTERPHONIE']){
  const r=parseRider('SONSON\nPatch RIO IN: In1: KM184 Jar\n'+heading+'\nCH;Source;Micro\n1;Voix lumière;SM58');assert.equal(r.channels.length,1);assert.ok(!r.audioRaw.includes(heading));assert.ok(!r.audioRaw.includes('Voix lumière'));
 }
});


test('explicit lighting sections cannot restart audio from console IN labels',()=>{
 const r=parseRider('LUMIÈRE\nPatch Console IN: In1: Side L / In2: Face');assert.equal(r.channels.length,0);
});
test('explicit audio ports can name a stage manager without mistaking contact lists for patch',()=>{
 const r=parseRider('SON\nPatch Console IN: In8: Régisseur\n1 Alice');assert.equal(r.channels.length,1);assert.equal(r.channels[0].name,'Régisseur');assert.equal(r.channels[0].input,8);
});


test('spares explicitly labelled in the patch or confirmed by the user do not count as additional active models',()=>{
 const r=prepare();assert.ok(r.channels.find(c=>c.name==='Spare L').spare);assert.equal(r.channels[1].spare,false);
 r.channels[1].spare=true;r.channels[1].name='DPA 2 · Spare';assert.deepEqual(inventoryWarnings(r.context,r.channels),[]);
 const p=planRiderImport(newShow(),r,{target:'new',name:'Show',model:'wing'});assert.equal(p.show.channels[1].input,2);assert.equal(p.show.channels[1].spare,true);assert.ok(p.show.channels[1].mute);
});

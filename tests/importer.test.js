import test from 'node:test';
import assert from 'node:assert/strict';
import {newShow,channel,assertProject} from '../src/core.js';
import {parseRider,splitTable} from '../src/importer.js';
import {layoutText,readRiderDocument} from '../src/rider-reader.js';
import {planRiderImport} from '../src/import-plan.js';
import {makeMix} from '../src/routing.js';
const options={target:'new',name:'Import',model:'wing',bank:'A',outBank:'A'};
const make=(text,opts={})=>planRiderImport(newShow(),parseRider(text),{...options,...opts});

test('titles containing commas do not hide a semicolon table',()=>{
 const r=parseRider('Groupe, tournée\nCH;Instrument;Microphone;Stand\n1;Kick;Shure SM57;Petit pied\n2;OH;Neumann KM184;Grand pied');
 assert.equal(r.channels.length,2);assert.equal(r.channels[0].importMeta.notes,'Petit pied');assert.equal(r.channels[1].phantom,true);
});
test('numbered OCR text recovers exact mic suffixes and preserves unknown labels',()=>{
 const r=parseRider('1 Kick In Shure SM57\n2 Lead Vocal Beta58A\n3 Guitare Micro inconnu');
 assert.equal(r.channels[0].name,'Kick In');assert.equal(r.channels[0].mic,'Shure SM57');assert.equal(r.channels[1].micId,'shurebeta58a');assert.equal(r.channels[2].name,'Guitare Micro inconnu');
});
test('rider abbreviations find catalogue profiles across brands and stay traceable',()=>{
 const labels=['Shure B-58','B52','Senn 906','Neu KM184','KN184','TLM170','421','EV RE20','Radal ProDI'];
 const text='CH;Source;Micro\n'+labels.map((label,i)=>`${i+1};Source ${i+1};${label}`).join('\n');
 const p=make(text);assert.deepEqual(p.errors,[]);
 const channels=assertProject(p.show).channels;
 assert.deepEqual(channels.map(c=>c.micProfile?.id),['shurebeta58a','shurebeta52a','sennheisere906','neumannkm184','neumannkm184','neumanntlm170r','sennheisermd421ii','electrovoicere20','radialprodi']);
 assert.deepEqual(channels.map(c=>c.importMeta.micOriginal),labels);
 assert.ok(channels.slice(2).every(c=>c.importMeta.micApproximate&&c.phantomMode==='manual'&&!c.phantom));
 assert.ok(channels.slice(0,2).every(c=>!c.importMeta.micApproximate&&c.phantomMode==='auto'));
});
test('incomplete references keep ambiguous variants, alternatives and wireless equipment unresolved',()=>{
 const labels=['B87','C414','C414 XL','AKG 414','KM18','KM184X','MKH416','B58 HF','Shure KM184','B58 / SM58'];
 const r=parseRider('CH;Source;Micro\n'+labels.map((label,i)=>`${i+1};Source ${i+1};${label}`).join('\n'));
 assert.deepEqual(r.channels.map(c=>c.mic),labels);
 assert.ok(r.channels.every(c=>!c.micId&&!c.phantom));
});
test('abbreviations survive flattened and inline patches without binding a wireless capsule to a wired model',()=>{
 const text='1 Kick B52\n2 Voix B58\n3 Overhead K184\nPatch RIO IN: In4: Voix Shure Axient AD2 caps B58 / In5: Voix B87C';
 const r=parseRider(text);
 assert.deepEqual(r.channels.map(c=>c.name),['Kick','Voix','Overhead','Voix Shure Axient AD2 caps B58','Voix B87C']);
 assert.deepEqual(r.channels.map(c=>c.micId),['shurebeta52a','shurebeta58a','neumannkm184',undefined,'shurebeta87c']);
 assert.deepEqual(r.channels.map(c=>c.phantom),[false,false,false,false,true]);
});
test('known abbreviations prepare phantom and explicit indications override both match types',()=>{
 const r=parseRider('CH;Source;Micro;48V\n1;Kick In;B91;\n2;Kick In spare;B91;non\n3;OH;Neuman KM184;oui');
 assert.deepEqual(r.channels.map(c=>[c.micId,c.phantom,c.phantomMode]),[
  ['shurebeta91a',true,'auto'],['shurebeta91a',false,'manual'],['neumannkm184',true,'manual']
 ]);
});
test('input headers and absent channel numbers work without discarding rows',()=>{
 const r=parseRider('Input\tInstrument\tMicrophone\n01\tSnare\tSM57\n02\tVoix\tSM58');assert.deepEqual(r.channels.map(c=>c.n),[1,2]);
 const r2=parseRider('Source;Micro\nKick;Beta91\nOH;KM184');assert.deepEqual(r2.channels.map(c=>c.n),[1,2]);
});
test('manual column mapping handles unusual tables, no numbers and output lists',()=>{
 const text='Technique de tournée\nModèle;Désignation;Prise\nSM57;Guitare;B 7\nKM184;OH;B 9',rows=splitTable(text);
 const r=parseRider(text,{mapping:{mic:0,name:1,input:2},startRow:2});assert.equal(r.channels.length,2);assert.equal(r.channels[0].input,7);assert.equal(r.channels[0].bank,'B');
 const o=parseRider('1;IEM;USB 9',{mapping:{n:0,name:1,port:2},kind:'outputs'});assert.equal(o.outputs[0].bank,'USB');
});
test('spatial extraction keeps multiword names and empty table columns aligned',()=>{
 const words=[['CH',10,10,15],['Source',80,10,40],['Micro',300,10,40],['48V',450,10,25],['1',10,30,8],['Kick',80,30,25],['In',110,30,12],['SM57',300,30,30],['2',10,50,8],['Lead Vocal',80,50,80],['non',450,50,22]].map(([text,x,y,width])=>({text,x,y,width,height:10}));
 const r=parseRider(layoutText(words));assert.equal(r.channels[0].name,'Kick In');assert.equal(r.channels[0].mic,'Shure SM57');assert.equal(r.channels[1].mic,'');assert.equal(r.channels[1].phantomMode,'manual');
});
test('stereo default physical sources are packed onto odd pairs',()=>{
 const p=make('CH;Source;Micro;Mode\n1;Kick;SM57;M\n2;Keys;DI;ST\n3;Voix;SM58;M');assert.deepEqual(p.errors,[]);assert.deepEqual(p.show.channels.map(c=>c.input),[1,3,2]);
});
test('default interfaces follow the chosen console, explicit addresses are retained',()=>{
 const p=make('CH;Source;Micro;Banque;Entrée\n1;Kick;SM57;;\n2;OH;KM184;AES50 B;9',{bank:'LCL',model:'compact'});assert.deepEqual(p.errors,[]);assert.equal(p.show.channels[0].bank,'LCL');assert.equal(p.show.channels[1].bank,'B');assert.equal(p.show.channels[1].input,9);
});
test('append allocation handles whole M32 pairs and internal bus reservations atomically',()=>{
 const s=newShow();s.model='m32';s.channels=[channel(1,{mode:'ST',input:1})];s.mixes=[makeMix('BUS',1,{mode:'ST',name:'Reserved'})];
 const r=parseRider('CH;Source;Micro;Mode\n1;Keys;DI;ST\n2;Voix;SM58;M\nPATCH SORTIES\nBus;Nom;Mode;Sortie\n1;IEM;ST;A 1');const before=JSON.stringify(s),p=planRiderImport(s,r,{target:'append',free:true});
 assert.deepEqual(p.errors,[]);assert.deepEqual(p.show.channels.map(c=>c.n),[1,3,5]);assert.equal(p.show.channels[1].input,3);assert.equal(p.show.outputs[0].bus,3);assert.equal(JSON.stringify(s),before);
});
test('import reports capacity and explicit conflicts before any application',()=>{
 const s=newShow();s.channels=[channel(1,{name:'Existing'})];const before=JSON.stringify(s),r=parseRider('CH;Source;Micro;Entrée\n1;Incoming;SM57;1');
 const p=planRiderImport(s,r,{target:'append'});assert.ok(p.errors.length);assert.equal(JSON.stringify(s),before);
 const full=make('CH;Source;Micro\n'+Array.from({length:41},(_,i)=>`${i+1};Voie ${i+1};SM57`).join('\n'),{free:true});assert.ok(full.errors.some(s=>/place disponible/.test(s)));
});
test('M32 rejects unsupported source banks, M/S and overflowing pairs',()=>{
 const p=make('CH;Source;Mode;Banque;Entrée\n32;Keys;ST;C;47',{model:'m32'});assert.ok(p.errors.length);
 const ms=make('CH;Source;Mode\n1;Mid side;M/S',{model:'m32'});assert.ok(ms.errors.length);
});
test('unknown and ambiguous mics never enable phantom, explicit off has priority',()=>{
 const p=make('CH;Source;Micro;48V\n1;OH;KM184;non\n2;Unknown;Micro mystère;\n3;Alt;SM57 ou KM184;\n4;Vox;SM58;oui');assert.deepEqual(p.errors,[]);
 assert.deepEqual(p.show.channels.map(c=>c.phantom),[false,false,false,true]);assert.equal(p.show.channels[2].mic,'SM57 ou KM184');
});
test('automatic phantom follows a selected non-preamp bank without touching the source result',()=>{
 const r=parseRider('CH;Source;Micro\n1;OH;KM184'),p=planRiderImport(newShow(),r,{...options,bank:'USB'});assert.deepEqual(p.errors,[]);assert.equal(p.show.channels[0].phantom,false);assert.equal(r.channels[0].phantom,true);
});
test('selected rows, raw extraction and notes survive project validation',()=>{
 const r=parseRider('CH;Source;Micro\n1;Keep;SM57\n2;Skip;SM58\nPrévoir un pied');r.channels[1].include=false;r.filename='rider.csv';r.selectedSections=['Patch'];
 const p=planRiderImport(newShow(),r,options);assert.deepEqual(p.errors,[]);assert.equal(p.show.channels.length,1);assert.equal(p.show.files[0].unparsed[0],'Prévoir un pied');assert.equal(assertProject(p.show).files[0].sections[0],'Patch');
});
test('repeated headers, duplicate numbers and invalid numeric fields remain reviewable',()=>{
 const r=parseRider('CH;Source;Micro;Gain\n1;A;SM57;3,5\nCH;Source;Micro;Gain\n1;B;SM58;inconnu');assert.equal(r.channels.length,2);assert.equal(r.channels[0].gain,3.5);assert.ok(planRiderImport(newShow(),r,options).errors.length);
});
test('reader rejects unsupported, oversized and empty files with actionable messages',async()=>{
 await assert.rejects(readRiderDocument({size:36*1024*1024,name:'rider.pdf'}),/35 Mo/);
 await assert.rejects(readRiderDocument({size:1,name:'rider.zip'}),/Format non reconnu/);
 await assert.rejects(readRiderDocument({size:0,name:'rider.txt',arrayBuffer:async()=>new ArrayBuffer(0)}),/Aucun texte/);
});
test('text reader supports UTF16 Excel exports and Windows CSV accents',async()=>{
 const bytes=new Uint8Array([255,254,...new Uint8Array(Buffer.from('CH\tSource\tMicro\n1\tVoix\tSM58','utf16le'))]);
 const doc=await readRiderDocument({size:bytes.length,name:'patch.tsv',arrayBuffer:async()=>bytes.buffer});assert.equal(parseRider(doc.sections[0].text).channels.length,1);
});

test('PDF continuation pages retain columns, output section and manual phantom indications',()=>{
 const first=parseRider('PATCH SORTIES\nBus;Nom;Mode;Sortie\n1;IEM 1;ST;B 1');
 const second=parseRider('2;IEM 2;ST;B 3',{state:first.state});assert.equal(second.outputs.length,1);assert.equal(second.outputs[0].bank,'B');assert.equal(second.channels.length,0);
 const state={};layoutText([['CH',10],['Source',100],['Micro',300],['48V',450]].map(([text,x])=>({text,x,y:10,width:30,height:10})),state);
 const text=layoutText([['2',10],['OH',100],['non',450]].map(([text,x])=>({text,x,y:10,width:30,height:10})),state);
 assert.equal(text,'2\tOH\t\tnon');
 const inputs=parseRider('No.;Source;Micro;48V\n1.;OH;KM184;oui');const continued=parseRider(text,{state:inputs.state});assert.equal(inputs.channels.length,1);assert.equal(continued.channels[0].phantomMode,'manual');assert.equal(continued.channels[0].mic,'');
});


test('only adjacent channel pairs are treated as stereo; larger ranges remain in the notes',()=>{
 const p=parseRider('CH;Source;Micro\n1-2;Keys;DI\n3-8;Drums;SM57');assert.equal(p.channels.length,1);assert.equal(p.channels[0].mode,'ST');assert.equal(p.unparsed.length,1);assert.ok(p.warnings[0].includes('voie par voie'));
});

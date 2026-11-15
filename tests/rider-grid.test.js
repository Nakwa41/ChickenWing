import test from 'node:test';
import assert from 'node:assert/strict';
import {detectTableGrids,gridCell} from '../src/rider-grid.js';
import {detectColumns,parseRider,parseRiderDocument} from '../src/importer.js';
import {nonAudioEvidence} from '../src/rider-context.js';
import {newShow,assertProject} from '../src/core.js';
import {planRiderImport} from '../src/import-plan.js';

function surface(){
 const width=320,height=260,data=new Uint8ClampedArray(width*height*4).fill(255);
 const ink=(x,y)=>{const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=110;};
 const line=(x1,y1,x2,y2)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)ink(x,y);};
 // Four-column patch with repeated rows and some text fragments.
 for(const y of [20,40,60,80,100,120])line(10,y,310,y);
 for(const x of [10,70,210,270,310])line(x,20,x,120);
 for(const y of [28,48,68,88,108])for(const x of [25,100,225,285])line(x,y,x+5,y+4);
 // A stage-plan rectangle has no repeated internal rows and must not be a table.
 line(20,170,280,171);line(20,230,280,231);line(20,170,21,231);line(279,170,280,231);
 return {data,width,height};
}
test('pixel detection distinguishes repeated table cells from a stage-plan box',()=>{
 const grids=detectTableGrids(surface());assert.equal(grids.length,1);assert.deepEqual(grids[0].xs,[10,70,210,270,310]);assert.deepEqual(grids[0].ys,[20,40,60,80,100,120]);
 const cell=gridCell(grids[0],1,2);assert.ok(cell.x>210&&cell.x+cell.width<270);assert.ok(cell.y>40&&cell.y+cell.height<60);
});
test('text-only images do not produce synthetic table cells',()=>{
 const pixels=surface();pixels.data.fill(255);assert.deepEqual(detectTableGrids(pixels),[]);
});
const rows=[
 [1,'BD in','B91','COMP'],[2,'BD out','B52','COMP'],[3,'SN Top','SM57','COMP'],[4,'SN Bot','SM57',''],[5,'FL','D4','GATE'],[6,'OH HH','SM81, KM184',''],[7,'OH SL','SM81, KM184',''],[8,'BASS L (out from pedal)','Radial, BSS','COMP'],[9,'BASS R (out from pedal)','Radial, BSS','COMP'],[10,'GTR mic1','SM57','COMP'],[11,'GTR mic2','MD421','COMP'],[12,'VOC Name (out from pedal)','SM58 + XLR',''],[13,'VOC Name (out from pedal)','XLR',''],[14,'VOC Name (Lead)','SM58','COMP']
];
const text='Technical Rider\nPatch\nNumber\tSource\tMic\tInsert\n\t\t\t\n'+rows.map(r=>r.join('\t')).join('\n');
test('Number is an explicit channel column, not an absent column to auto-number',()=>{
 assert.equal(detectColumns([['Number','Source','Mic','Insert']]).mapping.n,0);
 const r=parseRider(text);assert.deepEqual(r.channels.map(c=>c.n),Array.from({length:14},(_,i)=>i+1));assert.equal(r.outputs.length,0);
 const nonSequential=parseRider('Number;Source;Mic\n2;Voix;SM58\n8;Guitare;SM57');assert.deepEqual(nonSequential.channels.map(c=>c.n),[2,8]);
});
test('insert requests and microphone alternatives survive the complete import plan',()=>{
 const r=parseRiderDocument({filename:'image.png',sections:[{id:'image',label:'Image',text}]}),p=planRiderImport(newShow(),r,{target:'new',name:'Image',model:'wing'});
 assert.deepEqual(p.errors,[]);assert.equal(p.show.channels.length,14);assert.equal(p.show.fx.length,0);assert.equal(p.show.channels[4].importMeta.insert,'GATE');assert.ok(p.show.channels[4].importMeta.notes.includes('GATE'));
 assert.deepEqual(p.show.channels.filter(c=>c.importMeta.insert==='COMP').map(c=>c.n),[1,2,3,8,9,10,11,14]);
 assert.equal(p.show.channels[5].mic,'SM81, KM184');assert.equal(p.show.channels[5].phantom,false);assert.equal(p.show.channels[7].mic,'Radial, BSS');assert.ok(p.show.channels[10].mic.includes('421'));
 assert.equal(assertProject(p.show).channels[4].importMeta.insert,'GATE');assert.ok(p.show.channels.every(c=>!c.reviewed));
});
test('OCR @ errors in mic model text do not become emails or interrupt an established table',()=>{
 assert.equal(nonAudioEvidence('MD@21'),false);assert.equal(nonAudioEvidence('regie@example.com'),true);
 const r=parseRider('Number;Source;Mic\n11;GTR mic2;MD@21\n12;VOC;XLR\n13;VOC;XLR\n14;VOC Lead;SM58');assert.deepEqual(r.channels.map(c=>c.n),[11,12,13,14]);assert.equal(r.channels[0].mic,'MD@21');assert.equal(r.channels[0].phantom,false);
});
test('video and stage-plot sections cannot extend a patch with diagram labels',()=>{
 for(const heading of ['Video','Stage plot','Plan de scène']){
  const r=parseRider(text+'\n'+heading+'\nNumber\tSource\tMic\n1\tVOC 14\tSM58');assert.equal(r.channels.length,14);
 }
});
test('audio abbreviations receive useful color categories without renaming the sources',()=>{
 const r=parseRider(text);assert.equal(r.channels[0].category,'Batterie');assert.equal(r.channels[9].category,'Guitares');assert.equal(r.channels[13].category,'Voix');assert.equal(r.channels[0].name,'BD in');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {channel,newShow,demoShow,validate,exportSnapshot,importSnapshot,capacity,assertProject} from '../src/core.js';
import {parseRider,splitTable} from '../src/importer.js';
const baseline=JSON.parse(fs.readFileSync(new URL('../public/default.snap',import.meta.url)));
test('demo has no routing conflicts and respects stereo pairs',()=>assert.deepEqual(validate(demoShow()).filter(i=>i.level==='error'),[]));
test('stereo and M/S sources are stored on physical inputs, not read-only channel modes',()=>{
 const s=newShow();s.channels=[channel(1,{name:'M/S',mode:'M/S',input:3,phantom:true})];
 const snap=exportSnapshot(s,baseline);
 assert.equal(snap.type,'snapshot.11');assert.equal(snap.ae_data.io.in.A['3'].mode,'M/S');assert.equal(snap.ae_data.io.in.A['4'].mode,'M/S');assert.equal(snap.ae_data.io.in.A['3'].vph,true);assert.equal(snap.ae_data.ch['1'].in.conn.in,3);assert.equal(snap.ae_data.ch['1'].mute,true);assert.equal(snap.ae_data.ch['1'].fdr,-144);assert.equal(snap.ae_data.ch['1'].in.set.$mode,undefined);
});
test('output stereo uses odd/even internal sides of one bus',()=>{
 const s=newShow();s.channels=[channel(1)];s.outputs=[{id:'out',source:'BUS',bus:3,name:'IEM',bank:'A',port:9,mode:'ST'}];
 const a=exportSnapshot(s,baseline).ae_data;assert.deepEqual(a.io.out.A['9'],{grp:'BUS',in:5});assert.deepEqual(a.io.out.A['10'],{grp:'BUS',in:6});assert.equal(a.bus['3'].busmono,false);
});
test('preamp/source overlap, even stereo start, duplicate outputs and FX inserts block export',()=>{
 const s=demoShow();s.channels[1].input=1;s.channels[2].input=4;s.channels[2].mode='ST';s.outputs[1].port=1;s.fx[1].targetN=15;
 const errors=validate(s).filter(i=>i.level==='error');assert.ok(errors.length>=4);assert.throws(()=>exportSnapshot(s,baseline));
});
test('console models enforce their physical input counts',()=>{assert.equal(capacity('LCL','wing'),8);assert.equal(capacity('LCL','compact'),24);const s=newShow();s.channels=[channel(1,{bank:'LCL',input:9})];assert.ok(validate(s).some(i=>i.level==='error'));});
test('snapshot round-trip keeps routing, labels, phantom, sends and unsupported data',()=>{
 const s=demoShow();s.channels[0].sends={'2':{on:true,level:-12,tap:'PRE'}};
 const original=exportSnapshot(s,baseline);original.ae_data.custom_unknown={preserve:42};original.ce_data={private_surface:{setting:'keep'}};
 const loaded=importSnapshot(original);loaded.channels[0].name='Kick changed';
 const result=exportSnapshot(loaded,baseline);assert.equal(result.ae_data.ch['1'].name,'Kick changed');assert.equal(result.ae_data.ch['1'].send['2'].lvl,-12);assert.equal(result.ae_data.io.in.A['1'].vph,true);assert.equal(result.ae_data.custom_unknown.preserve,42);assert.deepEqual(result.ce_data,original.ce_data);
});
test('deleting an imported channel, moving an output and moving FX clears former assignments',()=>{
 const s=importSnapshot(exportSnapshot(demoShow(),baseline));s.channels=s.channels.filter(c=>c.n!==1);
 const output=s.outputs.find(o=>o.source==='BUS'&&o.bus===1);output.bank='B';output.port=7;
 const f=s.fx[0];const oldN=f.targetN;f.targetN=13;
 const result=exportSnapshot(s,baseline).ae_data;
 assert.equal(result.ch['1'].in.conn.grp,'OFF');assert.equal(result.ch['1'].mute,true);assert.equal(result.io.out.A['1'].grp,'OFF');assert.equal(result.io.out.B['7'].grp,'BUS');assert.equal(result.bus[oldN].postins.on,false);assert.equal(result.bus['13'].postins.ins,'FX1');
});
test('CSV supports BOM, semicolons, quoted delimiters and embedded newlines',()=>{
 const rows=splitTable('\uFEFFCH;Source;Micro\n1;"Kick; in";"Mic\ninfo"');assert.equal(rows[1][1],'Kick; in');assert.equal(rows[1][2],'Mic\ninfo');
 const parsed=parseRider('CH;Source;Micro;Mode;Banque;Entrée;48V\n1;Kick In;Beta91;M;A;1;oui\n2;Keys;DI;ST;B;3;non');assert.equal(parsed.channels.length,2);assert.equal(parsed.channels[0].phantom,true);assert.equal(parsed.channels[1].mode,'ST');assert.equal(parsed.channels[1].bank,'B');assert.equal(parsed.channels[1].input,3);assert.equal(parsed.channels[1].reviewed,false);
});
test('rider sections distinguish outputs and collect unparsed rider notes',()=>{
 const r=parseRider('PATCH ENTREES\nCH;Source;Micro\n1;Lead Vocal;SM58\nPrévoir de l’eau sur scène\nPATCH SORTIES\nBus;Nom;Mode;Sortie\n1;IEM Lead;ST;AES50 B 9');assert.equal(r.channels.length,1);assert.equal(r.outputs.length,1);assert.equal(r.outputs[0].bank,'B');assert.equal(r.outputs[0].port,9);assert.ok(r.unparsed.some(l=>l.includes('eau')));
});
test('plain numbered lists and repeated header rows are parsed safely',()=>{const r=parseRider('1 Kick In\n2 Snare Top\n3 Bass DI');assert.equal(r.channels.length,3);assert.equal(r.channels[1].category,'Batterie');assert.equal(r.channels[2].category,'Basse');});
test('exports do not mutate their imported template or baseline',()=>{const before=JSON.stringify(baseline);exportSnapshot(demoShow(),baseline);assert.equal(JSON.stringify(baseline),before);});
test('import rejects malformed snapshots and project files',()=>{assert.throws(()=>importSnapshot({type:'snapshot.11'}));assert.throws(()=>assertProject({name:'invalid'}));});
test('shared sources are allowed when their physical settings agree',()=>{const s=newShow();s.channels=[channel(1),channel(2,{input:1})];assert.equal(validate(s).filter(i=>i.level==='error').length,0);assert.ok(validate(s).some(i=>i.level==='warning'));s.channels[1].gain=12;assert.ok(validate(s).some(i=>i.level==='error'));});
test('single right-side output preserves its side and stereo bus setting on round-trip',()=>{const snap=exportSnapshot(demoShow(),baseline);snap.ae_data.io.out.C['20']={grp:'BUS',in:16};snap.ae_data.bus['8'].busmono=false;const s=importSnapshot(snap);const output=s.outputs.find(o=>o.bank==='C');assert.equal(output.side,'R');const result=exportSnapshot(s,baseline);assert.deepEqual(result.ae_data.io.out.C['20'],{grp:'BUS',in:16});assert.equal(result.ae_data.bus['8'].busmono,false);});
test('premium algorithms cannot be exported into standard FX slots',()=>{const s=demoShow();s.fx[0].slot=12;assert.ok(validate(s).some(i=>i.level==='error'&&i.text.includes('premium')));});

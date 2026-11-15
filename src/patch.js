import {yamahaReturnChannels} from './yamaha-effects.js';
import {pairedStereo,isYamaha,consoleProfile,logicalWidth,occupiedNumbers} from './consoles.js';
import {remapAssignments} from './groups.js';
import {refreshPhantom} from './microphones.js';
import {channel,clone,capacity,uid,validate} from './core.js';
import {getMixes,makeMix,remapSends,mixKey} from './routing.js';

const width=c=>c.mode==='M'?1:2;
const integer=(n,min,max,label)=>{if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${label} : choisissez un entier entre ${min} et ${max}.`);};
const align=(n,c,input)=>input&&width(c)===2&&n%2===0?n+1:n;
function check(s){
 const numbers=new Set(),physical=new Map();
 for(const c of s.channels){integer(c.n,1,consoleProfile(s).channels,'Numéro de voie');if(occupiedNumbers(s,c).some(n=>n>consoleProfile(s).channels||numbers.has(n)))throw new Error(`La voie ${c.n} est déjà occupée. Activez le décalage des numéros ou choisissez une place libre.`);for(const n of occupiedNumbers(s,c))numbers.add(n);
  integer(c.input,1,capacity(c.bank,s)-width(c)+1,`Patch de ${c.name}`);if(!isYamaha(s)&&width(c)===2&&c.input%2===0)throw new Error(`${c.name} : une source stéréo/M/S doit commencer sur une entrée impaire.`);
  for(let p=c.input;p<c.input+width(c);p++){const k=`${c.bank}.${p}`,old=physical.get(k);if(old&&(old.input!==c.input||old.mode!==c.mode||old.gain!==c.gain||old.phantom!==c.phantom))throw new Error(`Conflit d’entrée sur ${c.bank}.${p} entre ${old.name} et ${c.name}.`);physical.set(k,c);}
 }
 const mixes=new Set(),ports=new Set();
 for(const m of [...(s.mixes||[]),...s.outputs]){integer(m.bus,1,consoleProfile(s).strips[m.source]||0,'Numéro de bus');const key=mixKey(m);if(occupiedNumbers(s,m).some(n=>mixes.has(`${m.source}.${n}`)))throw new Error(`${key} est déjà utilisé. Choisissez un autre numéro ou décalez les bus suivants.`);for(const n of occupiedNumbers(s,m))mixes.add(`${m.source}.${n}`);}
 for(const o of s.outputs){integer(o.port,1,capacity(o.bank,s,true)-width(o)+1,`Sortie de ${o.name}`);for(let p=o.port;p<o.port+width(o);p++){const k=`${o.bank}.${p}`;if(ports.has(k))throw new Error(`La sortie ${k} est déjà affectée.`);ports.add(k);}}
 if(pairedStereo(s)){const errors=validate(s).filter(i=>i.level==='error');if(errors.length)throw new Error(errors[0].text);}
}
function remapNumbers(s,kind,mapping){
 remapAssignments(s,kind,mapping);
 if(kind==='CH')for(const c of s.channels){if(mapping[c.n]!==undefined)c.n=mapping[c.n];}
 else{for(const m of [...s.outputs,...(s.mixes||[])])if(m.source===kind&&mapping[m.bus]!==undefined)m.bus=mapping[m.bus];remapSends(s,kind,mapping);}
 for(const f of s.fx){if(kind==='CH'&&f.usage==='send'&&mapping[f.returnN]!==undefined)f.returnN=mapping[f.returnN];if(f.target===kind&&mapping[f.targetN]!==undefined)f.targetN=mapping[f.targetN];if(kind==='BUS'){if(mapping[f.sendLeft]!==undefined)f.sendLeft=mapping[f.sendLeft];if(mapping[f.sendRight]!==undefined)f.sendRight=mapping[f.sendRight];}if(f.rightTarget?.startsWith(kind+'.')){const n=Number(f.rightTarget.split('.')[1]);if(mapping[n]!==undefined)f.rightTarget=`${kind}.${mapping[n]}`;}}
}
const fxReturnRecords=s=>(s.fx||[]).filter(f=>yamahaReturnChannels(s,f).length).map(f=>({id:f.id,n:f.returnN,mode:'ST',name:`Retour FX ${f.slot}`}));
const location=(c,input)=>`${c.bank}.${input?c.input:c.port}${width(c)===2?'–'+((input?c.input:c.port)+1):''}`;
function report(before,after){
 const rows=[];
 for(const group of ['channels','outputs','mixes'])for(const c of after[group]||[]){const old=before[group]?.find(o=>o.id===c.id),isInput=group==='channels';const desc=v=>`${isInput?'CH '+v.n:v.source+' '+v.bus}${v.bank?' · '+location(v,isInput):' · Interne'}`;if(!old||desc(old)!==desc(c))rows.push({name:c.name,before:old?desc(old):'Nouvelle voie',after:desc(c)});}
 for(const f of after.fx||[]){const old=before.fx?.find(x=>x.id===f.id);if(old&&old.returnN!==f.returnN&&yamahaReturnChannels(after,f).length)rows.push({name:`Retour FX ${f.slot}`,before:`CH ${old.returnN}–${old.returnN+1}`,after:`CH ${f.returnN}–${f.returnN+1}`});}
 return {show:after,changes:rows};
}
export function planInsert(s,kind,opts){
 const next=clone(s),isInput=kind==='inputs',n=Number(opts.n),bank=opts.bank,port=Number(opts.port),mode=opts.mode||'M',source=opts.source||'BUS';
 integer(n,1,isInput?consoleProfile(s).channels:consoleProfile(s).strips[source],'Numéro');
 if(isInput&&s.channels.flatMap(c=>occupiedNumbers(s,c)).length>=consoleProfile(s).channels)throw new Error('Toutes les voies de la console sont déjà utilisées.');
 const records=isInput?[...next.channels,...fxReturnRecords(next)]:[...next.outputs,...(next.mixes||[])].filter(o=>o.source===source);
 if(opts.shiftNumbers){
  const delta=logicalWidth(s,{mode,source:isInput?undefined:source}),mapping={};let cursor=n+delta;
  for(const c of records.filter(c=>(isInput?c.n:c.bus)>=n).sort((a,b)=>(isInput?a.n-b.n:a.bus-b.bus))){
   const first=isInput?c.n:c.bus,count=logicalWidth(s,c);cursor=Math.max(first+delta,cursor);
   // Linked pairs stay odd/even; propagate any alignment gap to the following strips.
   if(count===2&&cursor%2===0)cursor++;
   for(const old of occupiedNumbers(s,c))mapping[old]=cursor+old-first;
   cursor+=count;
  }
  remapNumbers(next,isInput?'CH':source,mapping);
 }
 const created=isInput?channel(n,{name:opts.name.trim()||`Voie ${n}`,bank,input:port,mode,category:opts.category||'Autres'}):{...makeMix(source,n,{name:opts.name.trim()||`${source} ${n}`,mode,type:opts.type||'Wedge',tap:opts.tap||'PRE'}),bank,port};
 if(opts.shiftPatch){
  let cursor=port+width(created);
  const following=(isInput?next.channels:next.outputs).filter(c=>c.bank===bank&&(isInput?c.n>=n:c.source===source&&c.bus>=n)&&(isInput?c.input:c.port)>=port).sort((a,b)=>(isInput?a.input-b.input:a.port-b.port));
  for(const c of following){const key=isInput?'input':'port';c[key]=align(Math.max(c[key]+width(created),cursor),c,isInput&&!isYamaha(s));cursor=c[key]+width(c);}
 }
 if(isInput){next.channels.push(created);next.channels.sort((a,b)=>a.n-b.n);}else{const index=next.outputs.findIndex(o=>o.source===source&&o.bus>=n);next.outputs.splice(index<0?next.outputs.length:index,0,created);}
 for(const c of next.channels)if(c.phantomMode==='auto')refreshPhantom(next,c);
 check(next);return {...report(s,next),createdId:created.id};
}
export function planRenumber(s,kind,opts){
 const next=clone(s),isInput=kind==='inputs',logical=opts.target==='numbers',start=Number(opts.start),from=opts.scope==='from'?Number(opts.from):1;
 integer(start,1,logical?(isInput?consoleProfile(s).channels:consoleProfile(s).strips[opts.source]||16):capacity(opts.toBank,s,!isInput),'Numéro de départ');integer(from,1,isInput?consoleProfile(s).channels:consoleProfile(s).buses,'À partir du numéro');
 const source=opts.source||'BUS';
 const records=(isInput?[...next.channels,...(logical?fxReturnRecords(next):[])]:logical?[...next.outputs,...(next.mixes||[])].filter(o=>o.source===source):next.outputs.filter(o=>opts.source==='*'||o.source===source)).filter(c=>(isInput?c.n:c.bus)>=from).filter(c=>logical||opts.bank==='*'||c.bank===opts.bank).sort((a,b)=>(isInput?a.n-b.n:a.bus-b.bus));
 if(!records.length)throw new Error('Aucune voie ne correspond à cette sélection.');
 if(logical){let cursor=start;const mapping={};for(const c of records){const count=logicalWidth(s,c);if(count===2&&cursor%2===0)cursor++;for(const n of occupiedNumbers(s,c))mapping[n]=cursor+n-(isInput?c.n:c.bus);cursor+=count;}remapNumbers(next,isInput?'CH':source,mapping);if(isInput)next.channels.sort((a,b)=>a.n-b.n);}
 else{let cursor=start;for(const c of records){cursor=align(cursor,c,isInput&&!isYamaha(s));c[isInput?'input':'port']=cursor;c.bank=opts.toBank;if(isInput&&!['A','B','C','LCL'].includes(c.bank)&&!c.bank.startsWith('SB:'))c.phantom=false;cursor+=width(c);}}
 for(const c of next.channels)if(c.phantomMode==='auto')refreshPhantom(next,c);
 check(next);return report(s,next);
}

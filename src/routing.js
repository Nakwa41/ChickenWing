import {yamahaReturnId} from './yamaha-effects.js';
import {consoleProfile,isM32,isYamaha,isDM3,occupiedNumbers} from './consoles.js';
import {clone,uid} from './core.js';

export const mixKey=m=>`${m.source}.${m.bus}`;
export function makeMix(source,bus,props={}){return {id:uid(),source,bus,name:source==='MAIN'?`Main ${bus}`:source==='MTX'?`Matrice ${bus}`:`Bus ${bus}`,type:source==='MAIN'?'Main':'Groupe',mode:'ST',tap:'POST',mute:true,fader:-144,sends:{},mainSends:{},...props};}
export function getMixes(s,{allMains=true}={}){
 const map=new Map();
 for(const m of s.mixes||[])map.set(mixKey(m),m);
 for(const o of s.outputs||[])map.set(mixKey(o),o);
 if(isDM3(s))for(let n=1;n<=2;n++)if(!map.has(`FXB.${n}`))map.set(`FXB.${n}`,makeMix('FXB',n,{id:`fxbus-${n}`,name:`FX BUS ${n}`,type:'FX',mode:'M',fader:0,mute:false}));
 if(allMains)for(let n=1;n<=consoleProfile(s).mains;n++)if(!map.has(`MAIN.${n}`)){const native=s.template?.ae_data?.main?.[n];map.set(`MAIN.${n}`,makeMix('MAIN',n,{id:`main-${n}`,...((isM32(s)||isYamaha(s))?{name:n===1?'Main LR':isYamaha(s)?(isDM3(s)?'Main LR':s.model.startsWith('dm')?'Stereo B':'Mono C'):'M/C',mode:n===1||isYamaha(s)&&s.model.startsWith('dm')?'ST':'M'}:{}),...(native?{name:native.name||`Main ${n}`,mode:native.busmono?'M':'ST',mute:!!native.mute,fader:native.fdr??-144,referenceN:n}:{})}));}
 if(allMains&&(isM32(s)||isYamaha(s)))for(let n=1;n<=consoleProfile(s).matrices;n++)if(![...map.values()].some(m=>m.source==='MTX'&&occupiedNumbers(s,m).includes(n)))map.set(`MTX.${n}`,makeMix('MTX',n,{id:`matrix-${n}`,mode:'M',type:'Matrice'}));
 return [...map.values()].filter(m=>m.source==='BUS'||m.source==='MAIN'||isDM3(s)&&m.source==='FXB'||m.source==='MTX').sort((a,b)=>['BUS','FXB','MAIN','MTX'].indexOf(a.source)-['BUS','FXB','MAIN','MTX'].indexOf(b.source)||a.bus-b.bus);
}
export function ensureMix(s,key){
 const found=getMixes(s,{allMains:false}).find(m=>mixKey(m)===key);if(found)return found;
 const [source,n]=key.split('.');const m=clone(getMixes(s).find(m=>mixKey(m)===key)||makeMix(source,Number(n)));m.id=uid();(s.mixes??=[]).push(m);return m;
}
export function canRoute(s,source,dest){if(isYamaha(s)){const [a]=source.split('.'),[b]=dest.split('.');if(a==='FXR'){const f=s.fx.find(f=>f.usage==='send'&&yamahaReturnId(f)===Number(source.split('.')[1]));if(!f||isDM3(s)&&dest===`FXB.${f.slot}`||b==='BUS'&&[f.sendLeft,f.sendRight].includes(Number(dest.split('.')[1])))return false;}return source!==dest&&((['CH','FXR'].includes(a)&&['BUS','MAIN','MTX',...(isDM3(s)?['FXB']:[])].includes(b))||(a==='BUS'&&['MAIN','MTX'].includes(b))||(a==='MAIN'&&b==='MTX'));}if(!isM32(s))return source!==dest;const [a]=source.split('.'),[b]=dest.split('.');return source!==dest&&((['CH','FXR'].includes(a)&&['BUS','MAIN'].includes(b))||(a==='BUS'&&['MAIN','MTX'].includes(b))||(a==='MAIN'&&b==='MTX'));}
export function routingSource(s,key){
 const [kind,n]=key.split('.');if(kind==='FXR')return s.fx.find(f=>(isYamaha(s)?yamahaReturnId(f)===Number(n):f.slot===Math.ceil(Number(n)/2))&&f.usage==='send');return kind==='CH'?s.channels.find(c=>c.n===Number(n)):ensureMix(s,key);
}
export function getSend(s,sourceKey,destKey){
 const src=routingSource(s,sourceKey),[kind,n]=destKey.split('.');if(!src)return {on:false,level:-144,tap:'POST'};
 if(kind==='MAIN'){
  const value=src.mainSends?.[n]||{on:(sourceKey.startsWith('CH.')||sourceKey.startsWith('FXR.'))&&n==='1'?!!src.main:false,level:0,tap:'POST'};
  return {...value,on:(sourceKey.startsWith('CH.')||sourceKey.startsWith('FXR.'))&&n==='1'?!!src.main:!!value.on};
 }
 return (kind==='MTX'?src.matrixSends:kind==='FXB'?src.fxSends:src.sends)?.[n]||{on:false,level:-144,tap:'PRE'};
}
export function setSend(s,sourceKey,destKey,send){
 const [sourceKind]=sourceKey.split('.'),[destKind,n]=destKey.split('.');
 if(!canRoute(s,sourceKey,destKey))throw new Error('Cette liaison n’est pas disponible sur cette console.');
 if(sourceKey===destKey)throw new Error('Un bus ne peut pas être envoyé vers lui-même.');
 if(!Number.isFinite(send.level)||send.level< -144||send.level>10)throw new Error('Le niveau doit être compris entre −144 et +10 dB.');
 if(!['PRE','POST','GRP'].includes(send.tap))throw new Error('Point de prélèvement invalide.');
 if(send.tap==='GRP'&&(destKind==='MAIN'||sourceKind==='BUS'||isM32(s)&&(!['CH','FXR'].includes(sourceKind)||destKind!=='BUS')||isYamaha(s)&&(sourceKind!=='CH'||destKind!=='BUS')))throw new Error('Le mode Groupe est réservé aux envois de voies vers les bus.');
 const src=routingSource(s,sourceKey);if(!src)throw new Error('Source introuvable.');
 const values={on:!!send.on,level:send.level,tap:send.tap};if(isYamaha(s)){if(destKind==='MAIN'){values.tap='POST';values.level=0;}if(values.tap==='GRP')values.level=0;}if(isM32(s)){if(destKind==='MAIN'){values.tap='POST';if(n==='1')values.level=0;}if(values.tap==='GRP')values.level=0;}
 if(destKind==='MAIN'){(src.mainSends??={})[n]=values;if(['CH','FXR'].includes(sourceKind)&&n==='1')src.main=values.on;}
 else{const field=destKind==='MTX'?'matrixSends':destKind==='FXB'?'fxSends':'sends';(src[field]??={})[n]=values;if(isM32(s)){const sibling=Number(n)%2?Number(n)+1:Number(n)-1;if(src[field][sibling])src[field][sibling].tap=values.tap;}}
}
export function remapSends(s,kind,mapping){
 const keys=new Set(Object.keys(mapping));const targets=new Set(Object.values(mapping).map(String));
 const move=(old={})=>{
  const next={};for(const[k,v]of Object.entries(old))if(!keys.has(k)&&!targets.has(k))next[k]=v;
  for(const[k,n]of Object.entries(mapping))if(old[k])next[n]=old[k];return next;
 };
 for(const c of [...s.channels,...((isM32(s)||isYamaha(s))?s.fx.filter(f=>f.usage==='send'):[])]){
  if(kind==='BUS')c.sends=move(c.sends);
  if(kind==='MTX')c.matrixSends=move(c.matrixSends);
  if(kind==='MAIN'){const all=clone(c.mainSends||{});all[1]={on:c.main,level:all[1]?.level??0,tap:all[1]?.tap||'POST'};c.mainSends=move(all);c.main=!!c.mainSends[1]?.on;}
 }
 for(const m of [...s.outputs,...(s.mixes||[])]){if(kind==='BUS')m.sends=move(m.sends);if(kind==='MTX')m.matrixSends=move(m.matrixSends);if(kind==='MAIN')m.mainSends=move(m.mainSends);}
}

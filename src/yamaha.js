import {validateYamahaFx,yamahaReturnId,yamahaSlotLabel} from './yamaha-effects.js';
import {stageboxForBank,validateStageboxes,flattenYamahaPatch,resolveYamahaPort} from './yamaha-stageboxes.js';
import {consoleModel,consoleProfile,ioCapacity,occupiedNumbers,isDM3,isYamaha,nativeExtension,inputGainRange} from './consoles.js';
import {canRoute} from './routing.js';
import {exportYamahaDM} from './yamaha-dm.js';
import {exportYamahaCL} from './yamaha-cl.js';

export function validateYamaha(s){
 const p=consoleProfile(s),issues=[],add=(text,id=null,tab='inputs',level='error')=>issues.push({level,text,id,tab}),nums=new Set(),ports=new Map(),mixes=new Set(),outputs=new Set();
 issues.push(...validateStageboxes(s,ioCapacity('DANTE',s))); 
 if(!s.channels.length)add('Aucune voie d’entrée configurée.',null,'inputs','warning');
 for(const c of s.channels){
  const gain=inputGainRange(s,c.bank);
  if(!c.name?.trim())add(`CH ${c.n} : le nom est vide.`,c.id);
  if(!['M','ST'].includes(c.mode))add(`${c.name} : utilisez une voie mono ou une paire stéréo liée. Le M/S doit être décodé en amont.`,c.id);
  for(const n of occupiedNumbers(s,c)){if(!Number.isInteger(n)||n<1||n>p.channels||nums.has(n))add(`${c.name} : voie ${n} hors capacité ou déjà occupée.`,c.id);nums.add(n);}
  if(c.mode==='ST'&&c.n%2===0)add(`${c.name} : la paire de voies doit commencer sur un numéro impair.`,c.id);
  if(!Number.isInteger(c.input)||c.input<1||c.input+(c.mode==='ST'?1:0)>ioCapacity(c.bank,s))add(`${c.name} : entrée ${c.bank} hors capacité.`,c.id);
  if(c.phantom&&c.bank!=='LCL'&&!stageboxForBank(s,c.bank))add(`${c.name} : le 48 V du port Dante / carte se règle sur son préampli externe.`,c.id);
  for(let side=0;side<(c.mode==='ST'?2:1);side++){const resolved=resolveYamahaPort(s,c.bank,c.input+side),key=`${resolved.bank}.${resolved.port}`,prev=ports.get(key);if(prev&&(prev.gain!==c.gain||prev.phantom!==c.phantom))add(`${c.name} : gain / 48 V incompatible sur la source partagée ${key}.`,c.id);ports.set(key,c);}
  if(!Number.isFinite(c.gain)||c.gain<gain.min||c.gain>gain.max||!Number.isFinite(c.hpf)||c.hpf!==0&&(c.hpf<20||c.hpf>p.hpfMax)||!Number.isFinite(c.pan)||Math.abs(c.pan)>100)add(`${c.name} : gain (${gain.min} à ${gain.max} dB), coupe-bas (20 à ${p.hpfMax} Hz) ou pan invalide.`,c.id);
  if(c.bank!=='LCL'&&!stageboxForBank(s,c.bank)&&c.gain!==0)add(`${c.name} : le gain analogique de la source ${c.bank} se règle sur le préampli externe ; remettez ce gain à 0 dans ChickenWing.`,c.id);
  if(c.name?.length>p.nameLength)add(`${c.name} : le nom sera limité à ${p.nameLength} caractères dans la console.`,c.id,'inputs','warning');
  if(!c.reviewed)add(`${c.name} : information importée à vérifier.`,c.id,'inputs','warning');
 }
 for(const m of [...s.outputs,...(s.mixes||[])]){
  for(const n of occupiedNumbers(s,m)){const key=`${m.source}.${n}`;if(!Number.isInteger(n)||n<1||n>(p.strips[m.source]||0)||mixes.has(key))add(`${m.name} : ${key} hors capacité ou déjà occupé.`,m.id,'outputs');mixes.add(key);}
  if(!m.name?.trim())add(`${m.source} ${m.bus} : le nom du bus est vide.`,m.id,'outputs');
  if(!['M','ST'].includes(m.mode))add(`${m.name} (${m.source} ${m.bus}) : choisissez un format mono ou stéréo.`,m.id,'outputs');
  if(!['MAIN','FXB'].includes(m.source)&&m.mode==='ST'&&m.bus%2===0)add(`${m.name} (${m.source} ${m.bus}–${m.bus+1}) : ce bus stéréo doit commencer sur un numéro logique impair. Le port de sortie physique est indépendant.`,m.id,'outputs');
  if(m.source==='FXB'&&(m.mode!=='M'||m.bank))add('DM3 : les bus FX dédiés sont mono et internes.',m.id,'routing');
  const stereoMain=m.bus===1||!!consoleModel(s).dm;
  if(m.source==='MAIN'&&m.mode!==(stereoMain?'ST':'M'))add(`${m.name} : le format de cette sortie principale est ${stereoMain?'stéréo':'mono'}.`,m.id,'outputs');
  if(m.bank)for(let side=0;side<(m.mode==='ST'?2:1);side++){const n=m.port+side,resolved=resolveYamahaPort(s,m.bank,n,true),key=`${resolved.bank}.${resolved.port}`;if(!Number.isInteger(n)||n<1||n>ioCapacity(m.bank,s,true)||outputs.has(key))add(`${m.name} : sortie ${key} hors capacité ou déjà affectée.`,m.id,'outputs');outputs.add(key);}
 }
 const busKinds=new Map();
 for(const c of [...s.channels,...s.outputs,...(s.mixes||[]),...(s.fx||[]).filter(f=>f.usage==='send').map(f=>({...f,name:yamahaSlotLabel(s,f),source:'FXR',bus:yamahaReturnId(f),fader:f.returnLevel,mute:f.returnMute}))]){
  const key=`${c.source||'CH'}.${c.n||c.bus}`;
  if(!Number.isFinite(c.fader)||c.fader< -144||c.fader>10||typeof c.mute!=='boolean')add(`${c.name} : fader ou mute invalide.`,c.id,c.source?'outputs':'inputs');
  for(const [kind,field]of [['BUS','sends'],['MAIN','mainSends'],['MTX','matrixSends'],['FXB','fxSends']])for(const [n,send]of Object.entries(c[field]||{})){
   if(!Number.isInteger(Number(n))||Number(n)<1||Number(n)>(p.strips[kind]||0)||!Number.isFinite(send.level)||send.level< -144||send.level>10||!['PRE','POST','GRP'].includes(send.tap)||!canRoute(s,key,`${kind}.${n}`))add(`${c.name} : envoi vers ${kind} ${n} invalide.`,c.id,'routing');
   if(send.on&&[...s.outputs,...(s.mixes||[])].some(m=>m.source===kind&&m.mode==='ST'&&kind!=='MAIN'&&m.bus+1===Number(n)))add(`${c.name} : utilisez le premier numéro de la destination stéréo ${kind} ${Number(n)-1}–${n}.`,c.id,'routing');
   if(kind==='MAIN'&&send.on&&(send.level!==0||send.tap!=='POST'))add(`${c.name} : l’assignation Stereo / Mono Yamaha utilise le niveau de la voie (0 dB, post-fader).`,c.id,'routing');
   if(send.tap==='GRP'&&kind!=='BUS')add(`${c.name} : le mode FIXED / Groupe concerne les voies vers les MIX uniquement.`,c.id,'routing');
   if(kind==='BUS'&&send.on){const fixed=send.tap==='GRP',pair=Math.floor((Number(n)-1)/2),old=busKinds.get(pair);if(old!==undefined&&old!==fixed)add(`BUS ${n} : un bus Yamaha est FIXED (groupe) ou VARI pour toutes les voies.`,c.id,'routing');busKinds.set(pair,fixed);}
  }
 }
 if(s.channels.filter(c=>c.mode==='ST').length>(isDM3(s)?8:52))add('Le nombre de groupes de liaison stéréo dépasse la capacité de cette console.');
 issues.push(...validateYamahaFx(s));
 for(const [key,a]of Object.entries(s.groupAssignments||{})){const [kind,n]=key.split('.');if(!p.strips[kind]||!Number.isInteger(Number(n))||Number(n)<1||Number(n)>p.strips[kind]||!Array.isArray(a?.dcas)||!Array.isArray(a?.mutes)||a.dcas.some(n=>!Number.isInteger(n)||n<1||n>p.dca)||a.mutes.some(n=>!Number.isInteger(n)||n<1||n>p.mute))add(`Affectation de groupe invalide : ${key}.`,null,'groups');}
 if(isDM3(s)&&Object.entries(s.groupAssignments||{}).some(([key,a])=>!key.startsWith('CH.')&&a.mutes?.length))add('DM3 : les mute groups concernent les voies d’entrée uniquement.',null,'groups');
 for(const type of ['dca','mute'])for(const g of s.groups?.[type]||[])if(!Number.isInteger(g.n)||g.n<1||g.n>p[type]||typeof g.name!=='string'||typeof g.mute!=='boolean'||type==='dca'&&(!Number.isFinite(g.fader)||g.fader< -144||g.fader>10))add('Configuration de groupe Yamaha invalide.',null,'groups');
 if(!s.outputs.length)add('Aucune sortie physique configurée.',null,'outputs','warning');
 return issues;
}
const templates=new Map();
export async function exportYamahaScene(s,bytes){
 if(!isYamaha(s))throw new Error('Choisissez une console Yamaha.');
 const errors=validateYamaha(s).filter(i=>i.level==='error');if(errors.length)throw new Error(errors.map(i=>i.text).join('\n'));
 const model=consoleModel(s),family=model.dm||model.family;
 if(!bytes){if(!templates.has(family)){const extension=['dm5','dm7'].includes(family)?'.dmxf':family.startsWith('dm')?`.${family}f`:'.CLF';const response=await fetch(new URL(`../public/yamaha/${family}${extension}`,import.meta.url));if(!response.ok)throw new Error('La base Yamaha est introuvable. Relancez ChickenWing.');templates.set(family,new Uint8Array(await response.arrayBuffer()));}bytes=templates.get(family);}
 const prepared=flattenYamahaPatch(s);return model.dm?exportYamahaDM(prepared,bytes):exportYamahaCL(prepared,bytes);
}
export const yamahaEditor=s=>isDM3(s)?'DM3 Editor':consoleModel(s).dm?'DM Editor':consoleModel(s).family==='ql'?'QL Editor':'CL Editor';
export const yamahaExportDescription=s=>`${consoleProfile(s).name} · ${nativeExtension(s)} · ${yamahaEditor(s)}`;

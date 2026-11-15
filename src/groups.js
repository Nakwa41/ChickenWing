import {pairedStereo,consoleProfile,isM32} from './consoles.js';
// WING uses #D1..#D16 and #M1..#M8 strip tags for group membership.
export const STRIP_LIMITS={CH:40,AUX:8,FXR:8,BUS:16,MAIN:4,MTX:8};
export const nativeGroup={CH:'ch',AUX:'aux',FXR:'fxrtn',BUS:'bus',MAIN:'main',MTX:'mtx'};
export const CATEGORY_KEYS=['Batterie','Basse','Guitares','Claviers','Voix','Autres'];
const indexes=(values,max)=>[...new Set((values||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=max))].sort((a,b)=>a-b);
export function parseGroupTags(tags=''){return {dcas:indexes([...String(tags).matchAll(/#D(\d+)\b/g)].map(m=>m[1]),16),mutes:indexes([...String(tags).matchAll(/#M(\d+)\b/g)].map(m=>m[1]),8)};}
export function writeGroupTags(tags,assignment){const rest=String(tags||'').replace(/#[DM]\d+\b/g,'').replace(/\s+/g,' ').trim();return [rest,...indexes(assignment.dcas,16).map(n=>`#D${n}`),...indexes(assignment.mutes,8).map(n=>`#M${n}`)].filter(Boolean).join(' ');}
export function defaultGroups(s){return {dca:Array.from({length:consoleProfile(s).dca},(_,i)=>({n:i+1,name:'',col:1,mute:false,fader:0})),mute:Array.from({length:consoleProfile(s).mute},(_,i)=>({n:i+1,name:`Mute ${i+1}`,mute:false}))};}
export function initializeGroups(s){
 const defaults=defaultGroups(s);
 if(!s.groups){s.groups=defaults;for(const [type,key]of [['dca','dca'],['mute','mgrp']])for(const g of s.groups[type]){const row=s.template?.ae_data?.[key]?.[g.n];if(row)Object.assign(g,{name:row.name||g.name,mute:!!row.mute,...(type==='dca'?{col:row.col??1,fader:row.fdr??0}:{})});}}
 for(const type of ['dca','mute'])s.groups[type]=defaults[type].map(def=>({...def,...s.groups[type]?.find(g=>g.n===def.n)}));
 if(!s.groupAssignments){s.groupAssignments={};for(const [kind,group]of Object.entries(nativeGroup).filter(([kind])=>consoleProfile(s).strips[kind]))for(const [n,strip]of Object.entries(s.template?.ae_data?.[group]||{})){const a=parseGroupTags(strip.tags);if(a.dcas.length||a.mutes.length)s.groupAssignments[`${kind}.${n}`]=a;}}
 for(const c of s.channels||[]){const key=`CH.${c.n}`;if(!s.groupAssignments[key]&&c.dca)s.groupAssignments[key]={dcas:[c.dca],mutes:parseGroupTags(s.template?.ae_data?.ch?.[c.referenceN||c.n]?.tags).mutes};}
 initializeCategoryDcas(s);
}
// Color groups are independent. A sparse mapping is created only by an explicit conversion.
const CATEGORY_POLICY='opt-in-v1';
const neutralDca=g=>!g.mute&&g.fader===0&&g.col===1;
export function dcaMembers(s,n){const keys=new Set(Object.keys(s.groupAssignments||{}));for(const c of s.channels||[])keys.add(`CH.${c.n}`);return [...keys].filter(key=>getAssignment(s,key).dcas.includes(n));}
export function isDcaConfigured(s,n){const g=s.groups.dca.find(g=>g.n===n);return !!g&&(!!g.name.trim()||!neutralDca(g)||dcaMembers(s,n).length>0);}
export function availableDcas(s,current=0){return s.groups.dca.filter(g=>g.n===current||(!isDcaConfigured(s,g.n)&&!Object.values(s.categoryDcas||{}).includes(g.n)));}
function initializeCategoryDcas(s){
 if(s.categoryDcaPolicy!==CATEGORY_POLICY){
  // Retire only the previous automatic assignments. User-edited groups become independent DCAs.
  for(const [category,n]of Object.entries(s.categoryDcas||{})){
   const g=s.groups.dca.find(g=>g.n===n),generated=g&&neutralDca(g)&&(g.name===category||/^DCA\s*\d+$/i.test(g.name));
   for(const c of s.channels||[])if(c.categoryDca===n){
    if(generated){const a=getAssignment(s,`CH.${c.n}`);a.dcas=a.dcas.filter(v=>v!==n);s.groupAssignments[`CH.${c.n}`]=a;c.dca=a.dcas[0]||0;}
    c.categoryDca=null;
   }
   if(generated&&!dcaMembers(s,n).length)Object.assign(g,defaultGroups(s).dca[n-1]);
  }
  s.categoryDcas={};s.categoryDcaFollow={};s.categoryDcaPolicy=CATEGORY_POLICY;
  for(const g of s.groups.dca)if(/^DCA\s*\d+$/i.test(g.name)&&neutralDca(g)&&!dcaMembers(s,g.n).length)g.name='';
 }
 s.categoryDcas??={};s.categoryDcaFollow??={};
 for(const c of s.channels||[])if(c.categoryDca===undefined){
  const n=s.categoryDcas[c.category],a=getAssignment(s,`CH.${c.n}`);
  if(n&&s.categoryDcaFollow[c.category]===true&&c.referenceN==null){a.dcas=indexes([...a.dcas,n],consoleProfile(s).dca);s.groupAssignments[`CH.${c.n}`]=a;c.dca=a.dcas[0]||0;c.categoryDca=n;}
  else c.categoryDca=null;
 }
}
export function categoryLabel(s,key){return s.groups?.dca?.find(g=>g.n===s.categoryDcas?.[key])?.name||key;}
export function categoryOptions(s,withDca=false){return CATEGORY_KEYS.map(key=>[key,categoryLabel(s,key)+(withDca&&s.categoryDcas?.[key]?` · DCA ${s.categoryDcas[key]}`:'')]);}
export function setChannelCategory(s,c,category){
 if(!CATEGORY_KEYS.includes(category))throw new Error('Groupe d’entrée inconnu.');
 initializeGroups(s);const a=getAssignment(s,`CH.${c.n}`),previous=c.categoryDca,next=s.categoryDcaFollow[category]===true?s.categoryDcas[category]:null;
 a.dcas=indexes([...a.dcas.filter(n=>n!==previous),next],consoleProfile(s).dca);s.groupAssignments[`CH.${c.n}`]=a;Object.assign(c,{category,categoryDca:next||null,dca:a.dcas[0]||0});
}
function releaseCategoryDca(s,category){
 const n=s.categoryDcas[category];if(!n)return;
 for(const c of s.channels||[])if(c.categoryDca===n){setAssignment(s,`CH.${c.n}`,'dca',n,false);c.categoryDca=null;}
 delete s.categoryDcas[category];delete s.categoryDcaFollow[category];
 const g=s.groups.dca.find(g=>g.n===n);if(g?.categoryGroup===category){delete g.categoryGroup;if(!dcaMembers(s,n).length)Object.assign(g,defaultGroups(s).dca[n-1]);}
}
export function configureCategoryDca(s,category,{mode='dca',n,name=category,follow=false}={}){
 initializeGroups(s);if(!CATEGORY_KEYS.includes(category))throw new Error('Groupe d’entrée inconnu.');
 if(!['colors','dca'].includes(mode))throw new Error('Choisissez le comportement du groupe.');
 if(mode==='colors'){releaseCategoryDca(s,category);return;}
 n=Number(n);name=String(name).trim();
 if(!name||name.length>8)throw new Error('Le nom du DCA doit contenir de 1 à 8 caractères.');
 if(!availableDcas(s,s.categoryDcas[category]).some(g=>g.n===n))throw new Error('Ce DCA est déjà utilisé. Choisissez un emplacement libre.');
 if(s.categoryDcas[category]&&s.categoryDcas[category]!==n)releaseCategoryDca(s,category);
 s.categoryDcas[category]=n;s.categoryDcaFollow[category]=!!follow;
 Object.assign(s.groups.dca.find(g=>g.n===n),{name,categoryGroup:category});
 for(const c of s.channels||[])if(c.category===category){setAssignment(s,`CH.${c.n}`,'dca',n,true);c.categoryDca=n;}
}
export function createCustomDca(s,{n,name,keys=[]}){
 initializeGroups(s);n=Number(n);name=String(name||'').trim();
 if(!availableDcas(s).some(g=>g.n===n))throw new Error('Ce DCA est déjà utilisé. Choisissez un emplacement libre.');
 if(!name||name.length>8)throw new Error('Le nom du DCA doit contenir de 1 à 8 caractères.');
 for(const key of keys){const [kind,index]=key.split('.');if(!consoleProfile(s).strips[kind]||!Number.isInteger(Number(index))||Number(index)<1||Number(index)>consoleProfile(s).strips[kind])throw new Error('Source de groupe invalide.');}
 s.groups.dca.find(g=>g.n===n).name=name;
 for(const key of keys)setAssignment(s,key,'dca',n,true);
}
export function clearDca(s,n){
 initializeGroups(s);if(!Number.isInteger(n)||n<1||n>consoleProfile(s).dca)throw new Error('Numéro de DCA invalide.');
 for(const key of dcaMembers(s,n))setAssignment(s,key,'dca',n,false);
 for(const [category,value]of Object.entries(s.categoryDcas))if(value===n){delete s.categoryDcas[category];delete s.categoryDcaFollow[category];}
 s.groups.dca[n-1]=defaultGroups(s).dca[n-1];
}
export function importGroups(s,ae){
 s.groups=defaultGroups(s);s.groupAssignments={};s.categoryDcas={};s.categoryDcaFollow={};s.categoryDcaPolicy=CATEGORY_POLICY;
 for(const [type,key]of [['dca','dca'],['mute','mgrp']])for(const g of s.groups[type]){const row=ae[key]?.[g.n];if(row)Object.assign(g,{name:row.name||g.name,mute:!!row.mute,...(type==='dca'?{col:row.col??1,fader:row.fdr??0}:{})});}
 for(const [kind,key]of Object.entries(nativeGroup).filter(([kind])=>consoleProfile(s).strips[kind]))for(const [n,strip]of Object.entries(ae[key]||{})){const a=parseGroupTags(strip.tags);s.groupAssignments[`${kind}.${n}`]=a;}
}
function pairRoot(s,key){
 if(!pairedStereo(s))return key;const [kind,value]=key.split('.'),n=Number(value);
 if(kind==='FXR'&&n%2===0&&s.fx?.some(f=>f.usage==='send'&&f.slot===n/2))return `FXR.${n-1}`;
 const records=kind==='CH'?s.channels:[...(s.outputs||[]),...(s.mixes||[])].filter(m=>m.source===kind);
 const parent=records.find(c=>c.mode==='ST'&&kind!=='MAIN'&&(c.n??c.bus)+1===n);return parent?`${kind}.${n-1}`:key;
}
export function getAssignment(s,key){key=pairRoot(s,key);if(s.groupAssignments?.[key])return {dcas:indexes(s.groupAssignments[key].dcas,consoleProfile(s).dca),mutes:indexes(s.groupAssignments[key].mutes,consoleProfile(s).mute)};const [kind,n]=key.split('.');if(kind==='CH'){const c=s.channels.find(c=>c.n===Number(n));if(c)return {dcas:c.dca?[c.dca]:[],mutes:[]};}return parseGroupTags(s.template?.ae_data?.[nativeGroup[kind]]?.[n]?.tags);}
export function setAssignment(s,key,type,n,on){
 key=pairRoot(s,key);
 const [kind,index]=key.split('.');if(!consoleProfile(s).strips[kind]||!Number.isInteger(Number(index))||Number(index)<1||Number(index)>consoleProfile(s).strips[kind])throw new Error('Source de groupe invalide.');
 const max=type==='dca'?consoleProfile(s).dca:type==='mute'?consoleProfile(s).mute:0;if(!Number.isInteger(n)||n<1||n>max)throw new Error('Numéro de groupe invalide.');
 const a=getAssignment(s,key),field=type==='dca'?'dcas':'mutes';a[field]=indexes(on?[...a[field],n]:a[field].filter(v=>v!==n),max);(s.groupAssignments??={})[key]=a;if(pairedStereo(s)){const next=`${kind}.${Number(index)+1}`;if(pairRoot(s,next)===key)s.groupAssignments[next]=structuredClone(a);}
 if(kind==='CH'){const c=s.channels.find(c=>c.n===Number(index));if(c){c.dca=a.dcas[0]||0;if(type==='dca'){if(!on&&n===c.categoryDca)c.categoryDca=null;}}}
}
export function remapAssignments(s,kind,mapping){
 if(!s.groupAssignments)return;
 const result={...s.groupAssignments};for(const [old,n]of Object.entries(mapping)){result[`${kind}.${old}`]={dcas:[],mutes:[]};delete result[`${kind}.${n}`];}
 for(const old of Object.keys(mapping))if(!Object.values(mapping).includes(Number(old)))result[`${kind}.${old}`]={dcas:[],mutes:[]};
 for(const [old,n]of Object.entries(mapping)){const value=s.groupAssignments[`${kind}.${old}`];if(value)result[`${kind}.${n}`]=structuredClone(value);}
 s.groupAssignments=result;
}
export function exportGroups(s,ae){
 for(const [type,key]of [['dca','dca'],['mute','mgrp']])for(const g of s.groups?.[type]||[]){const node=(ae[key]??={})[g.n]??={};Object.assign(node,{name:g.name.slice(0,8),mute:!!g.mute});if(type==='dca')Object.assign(node,{col:g.col,fdr:g.fader});}
 const keys=new Set(Object.keys(s.groupAssignments||{}));for(const c of s.channels)keys.add(`CH.${c.n}`);
 for(const key of keys){const [kind,n]=key.split('.');if(!STRIP_LIMITS[kind]||Number(n)<1||Number(n)>STRIP_LIMITS[kind])continue;const strip=((ae[nativeGroup[kind]]??={})[n]??={});strip.tags=writeGroupTags(strip.tags,getAssignment(s,key));}
}
export function groupStrips(s,mixes){
 const map=new Map();for(const c of s.channels)map.set(`CH.${c.n}`,{key:`CH.${c.n}`,kind:'CH',n:c.n,name:c.name,category:c.category,used:true});
 for(const m of mixes)map.set(`${m.source}.${m.bus}`,{key:`${m.source}.${m.bus}`,kind:m.source,n:m.bus,name:m.name,category:m.type,used:true});
 if(isM32(s))for(const f of s.fx||[])if(f.usage==='send'&&f.slot<=4)for(const side of [0,1]){const n=(f.slot-1)*2+1+side;map.set(`FXR.${n}`,{key:`FXR.${n}`,kind:'FXR',n,name:`FX ${f.slot} ${side?'R':'L'}`,category:'FX',used:true});}
 for(const [kind,max]of Object.entries(consoleProfile(s).strips))for(let n=1;n<=max;n++){const key=`${kind}.${n}`;if(map.has(key))continue;const native=s.template?.ae_data?.[nativeGroup[kind]]?.[n],a=getAssignment(s,key);map.set(key,{key,kind,n,name:native?.name||`${kind} ${n}`,category:'Autres',used:!!native?.name||a.dcas.length>0||a.mutes.length>0});}
 return [...map.values()].sort((a,b)=>Object.keys(consoleProfile(s).strips).indexOf(a.kind)-Object.keys(consoleProfile(s).strips).indexOf(b.kind)||a.n-b.n);
}

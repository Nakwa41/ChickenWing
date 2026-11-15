import {applyM32Processing} from './native-processing.js';
import {consoleProfile,isM32,ioCapacity,logicalWidth,occupiedNumbers} from './consoles.js';
import {m32EffectAllowed,m32EffectInfo} from './m32-effects.js';
import {getAssignment,initializeGroups} from './groups.js';
import {getMixes,getSend,canRoute} from './routing.js';
const pad=n=>String(n).padStart(2,'0'),on=v=>v?'ON':'OFF';
const text=(v,max=12)=>'"'+String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ').replace(/["\\]/g,' ').slice(0,max)+'"';
const level=n=>n<=-90?'-oo':Number(n||0).toFixed(1);
const bits=(values,count)=>'%'+Array.from({length:count},(_,i)=>values.includes(count-i)?'1':'0').join('');
const color={Batterie:'YE',Basse:'MG',Guitares:'BL',Claviers:'CY',Voix:'RD',Autres:'WH'};
const colorNames=['OFF','RD','GN','YE','BL','MG','CY','WH','OFFi','RDi','GNi','YEi','BLi','MGi','CYi','WHi'];
const sourceId=(bank,n)=>({LCL:0,A:32,B:80,USB:128,AUX:160}[bank]??NaN)+n;
const headampId=(bank,n)=>({LCL:0,A:32,B:80}[bank]??NaN)+n-1;
const stripPath=(kind,n)=>kind==='MAIN'?`/main/${Number(n)===1?'st':'m'}`:`/${({CH:'ch',AUX:'auxin',FXR:'fxrtn',BUS:'bus',MTX:'mtx'})[kind]}/${pad(n)}`;
const parseTokens=s=>(s.match(/"[^"\r\n]*"|\S+/g)||[]).map(v=>v.startsWith('"')?v.slice(1,-1):v);
export function parseM32Scene(raw){if(typeof raw!=='string'||!/^#(?:4\.0|[23]\.\d+)#\s/.test(raw.trimStart()))throw new Error('Ce fichier n’est pas une scène M32/X32 reconnue.');const nodes=new Map();for(const line of raw.split(/\r?\n/)){if(!line.startsWith('/'))continue;const split=line.indexOf(' ');if(split<0)continue;nodes.set(line.slice(0,split),line.slice(split+1).trim());}if(!nodes.has('/ch/01/config')||!nodes.has('/config/routing/IN'))throw new Error('La scène M32 est incomplète : voies ou routage manquants.');return nodes;}
// A User Out slot is shared by all connector banks. Deduplicate eight-channel blocks;
// refuse an unrepresentable patch instead of silently routing a different source.
export function planM32Outputs(s){
 const main=Array(16).fill(null),aux=Array(6).fill(null),aes=Array(2).fill(null),p16=Array(16).fill(null),banks={LCL:Array(16).fill(null),A:Array(48).fill(null),B:Array(48).fill(null),USB:Array(32).fill(null)};
 const signal=(o,side)=>({code:o.source==='MAIN'?(o.bus===1?side+1:3):o.source==='BUS'?o.bus+3+side:o.bus+19+side,tap:o.tap==='PRE'?'PRE+M':'POST'});
 for(const o of s.outputs){const width=o.mode==='ST'?2:1,bank=o.bank==='AUX'?aux:o.bank==='AES'?aes:banks[o.bank];if(!bank)throw new Error(`${o.name} : interface de sortie indisponible sur M32.`);for(let side=0;side<width;side++)bank[o.port-1+side]=signal(o,o.mode==='M'&&o.source==='MAIN'&&o.bus===1&&o.side==='R'?1:side);}
 const signature=v=>v?`${v.code}/${v.tap}`:'OFF';
 const allocate=v=>{if(!v)return 0;let n=main.findIndex(x=>signature(x)===signature(v));if(n>=0)return 169+n;n=p16.findIndex(x=>signature(x)===signature(v));if(n>=0)return 185+n;n=main.indexOf(null);if(n>=0){main[n]=v;return 169+n;}n=p16.indexOf(null);if(n>=0){p16[n]=v;return 185+n;}throw new Error('Le patch M32 dépasse les 32 points de sortie Out / P16 disponibles. Réutilisez un même signal et point de prélèvement.');};
 const blocks=[],routing={},userOut=Array(48).fill(0);
 for(const [bank,values]of Object.entries(banks)){routing[bank]=[];for(let i=0;i<values.length;i+=8){const block=values.slice(i,i+8).map(allocate),key=block.join(',');let index=blocks.indexOf(key);if(index<0){index=blocks.length;if(index>=6)throw new Error('Ce patch nécessite plus de 6 blocs User Out distincts. Regroupez les adresses AES50 / Card ou partagez les blocs identiques.');blocks.push(key);userOut.splice(index*8,8,...block);}routing[bank].push(`UOUT${index*8+1}-${index*8+8}`);}}
 return {main,aux,aes,p16,userOut,routing};
}
export function validateM32(s){
 const issues=[],add=(level,text,id=null,tab='inputs')=>issues.push({level,text,id,tab}),nums=new Set(),physical=new Map(),mixNums={BUS:new Set(),MTX:new Set(),MAIN:new Set()},ports=new Set();
 if(!s.channels.length)add('warning','Aucune voie d’entrée configurée.');
 for(const c of s.channels){
  if(typeof c.name!=='string'||!c.name.trim())add('error',`CH ${c.n} : le nom est vide.`,c.id);
  if(!['M','ST'].includes(c.mode))add('error',`${c.name} : la M32 utilise des voies mono ou des paires stéréo liées ; le M/S doit être décodé en amont.`,c.id);
  for(const n of occupiedNumbers(s,c)){if(!Number.isInteger(n)||n<1||n>32||nums.has(n))add('error',`${c.name} : voie M32 ${n} indisponible ou déjà occupée.`,c.id);nums.add(n);}
  if(c.mode==='ST'&&c.n%2===0)add('error',`${c.name} : la paire de voies M32 doit commencer sur une voie impaire.`,c.id);
  if(!Number.isInteger(c.input)||c.input<1||c.input+(c.mode==='ST'?1:0)>ioCapacity(c.bank,s))add('error',`${c.name} : entrée hors capacité M32.`,c.id);
  if(c.mode==='ST'&&c.input%2===0)add('error',`${c.name} : la paire physique doit commencer sur une entrée impaire.`,c.id);
  if(c.phantom&&!['LCL','A','B'].includes(c.bank))add('error',`${c.name} : le 48 V nécessite un préampli Local ou AES50.`,c.id);
  for(let side=0;side<(c.mode==='ST'?2:1);side++){const key=`${c.bank}.${c.input+side}`,old=physical.get(key);if(old&&(old.gain!==c.gain||old.phantom!==c.phantom))add('error',`${c.name} : gain / 48 V incompatible sur la source partagée ${key}.`,c.id);physical.set(key,c);}
  if(!Number.isFinite(c.gain)||c.gain< -12||c.gain>60||!Number.isFinite(c.hpf)||c.hpf!==0&&(c.hpf<20||c.hpf>400)||!Number.isFinite(c.pan)||Math.abs(c.pan)>100)add('error',`${c.name} : gain (−12 à +60), coupe-bas (20 à 400 Hz) ou pan invalide.`,c.id);
  if(!c.reviewed)add('warning',`${c.name} : information importée à vérifier.`,c.id);
  if(c.name.length>12)add('warning',`${c.name} : nom limité à 12 caractères dans la M32.`,c.id);
 }
 for(const m of [...s.outputs,...(s.mixes||[])]){
  const max=consoleProfile(s).strips[m.source]||0;if(!mixNums[m.source]){add('error',`${m.name} : source indisponible.`,m.id,'outputs');continue;}
  for(const n of occupiedNumbers(s,m)){if(!Number.isInteger(n)||n<1||n>max||mixNums[m.source].has(n))add('error',`${m.name} : ${m.source} ${n} indisponible ou déjà occupé.`,m.id,'outputs');mixNums[m.source].add(n);}
  if(!m.name?.trim()||!['M','ST'].includes(m.mode)||m.source!=='MAIN'&&m.mode==='ST'&&m.bus%2===0||m.source==='MAIN'&&(m.bus===1&&m.mode!=='ST'||m.bus===2&&m.mode!=='M'))add('error',`${m.name} : format incompatible avec la M32 (bus liés impair/pair, Main LR stéréo, M/C mono).`,m.id,'outputs');
  if(m.bank)for(let side=0;side<(m.mode==='ST'?2:1);side++){const n=m.port+side,key=`${m.bank}.${n}`;if(!Number.isInteger(n)||n<1||n>ioCapacity(m.bank,s,true)||ports.has(key))add('error',`${m.name} : sortie M32 ${key} indisponible ou déjà affectée.`,m.id,'outputs');ports.add(key);}
 }
 for(const c of [...s.channels,...s.outputs,...(s.mixes||[]),...s.fx.filter(f=>f.usage==='send').map(f=>({...f,name:`Retour FX ${f.slot}`,source:'FXR',bus:(f.slot-1)*2+1,fader:f.returnLevel,mute:f.returnMute}))]){
  if(!Number.isFinite(c.fader)||c.fader< -144||c.fader>10||typeof c.mute!=='boolean')add('error',`${c.name} : niveau ou mute invalide.`,c.id,c.n?'inputs':'outputs');
  for(const [kind,field]of [['BUS','sends'],['MAIN','mainSends'],['MTX','matrixSends']])for(const [n,send]of Object.entries(c[field]||{})){
   const source=`${c.n?'CH':c.source}.${c.n||c.bus}`,dest=`${kind}.${n}`;
   if(send.tap==='GRP'&&(!['CH','FXR'].includes(c.n?'CH':c.source)||kind!=='BUS'))add('error',`${c.name} : le mode Groupe est réservé aux voies / retours FX vers les bus.`,c.id,'routing');
   if(send.on&&!canRoute(s,source,dest))add('error',`${c.name} → ${dest} : envoi indisponible sur M32.`,c.id,'routing');
   if(!Number.isInteger(Number(n))||Number(n)<1||Number(n)>consoleProfile(s).strips[kind]||!Number.isFinite(send.level)||send.level< -144||send.level>10||!['PRE','POST','GRP'].includes(send.tap)||kind==='MAIN'&&send.tap!=='POST')add('error',`${c.name} : envoi ${dest} invalide.`,c.id,'routing');
   if(send.on&&kind==='MAIN'&&Number(n)===1&&send.level!==0)add('error',`${c.name} : Main LR est une assignation à 0 dB sur M32.`,c.id,'routing');
   const sibling=c[field]?.[Number(n)%2?Number(n)+1:Number(n)-1];if(kind!=='MAIN'&&send.on&&sibling?.on&&send.tap!==sibling.tap)add('error',`${c.name} : les prélèvements de la paire ${kind} ${Number(n)%2?n:Number(n)-1} doivent être identiques.`,c.id,'routing');
  }
 }
 const slots=new Set(),inserts=new Set();
 for(const f of s.fx){
  if(slots.has(f.slot)||!m32EffectAllowed(f.model,f.slot))add('error',`FX ${f.slot} : modèle ou slot incompatible avec la M32.`,f.id,'fx');slots.add(f.slot);
  if(f.usage==='send'){if(f.slot>4||![f.sendLeft,f.sendRight].every(n=>Number.isInteger(n)&&n>=1&&n<=16)||!Number.isFinite(f.returnLevel)||f.returnLevel< -144||f.returnLevel>10)add('error',`FX ${f.slot} : envoi / retour invalide (slots 1–4 uniquement).`,f.id,'fx');}
  else{const max=consoleProfile(s).strips[f.target]||0,key=`${f.target}.${f.targetN}`;if(!['CH','BUS','MAIN','MTX'].includes(f.target)||!Number.isInteger(f.targetN)||f.targetN<1||f.targetN>max||!['preins','postins'].includes(f.position)||inserts.has(key))add('error',`FX ${f.slot} : la M32 possède un seul insert par tranche.`,f.id,'fx');inserts.add(key);const target=f.target==='CH'?s.channels.find(c=>c.n===f.targetN):getMixes(s).find(m=>m.source===f.target&&m.bus===f.targetN);if(target&&logicalWidth(s,target)===2){if(inserts.has(`${f.target}.${f.targetN+1}`))add('error',`FX ${f.slot} : côté droit de la paire déjà inséré.`,f.id,'fx');inserts.add(`${f.target}.${f.targetN+1}`);}if(f.rightTarget){const [kind,value]=f.rightTarget.split('.'),n=Number(value);if(!['CH','BUS','MAIN','MTX'].includes(kind)||!Number.isInteger(n)||n<1||n>consoleProfile(s).strips[kind]||inserts.has(f.rightTarget)||target&&(logicalWidth(s,target)===2||f.target==='MAIN'&&f.targetN===1))add('error',`FX ${f.slot} : destination du canal droit indisponible ou déjà occupée.`,f.id,'fx');inserts.add(f.rightTarget);} }
 }
 for(const [type,max]of [['dca',8],['mute',6]])for(const g of s.groups?.[type]||[])if(!Number.isInteger(g.n)||g.n<1||g.n>max||typeof g.name!=='string'||typeof g.mute!=='boolean'||type==='dca'&&(!Number.isFinite(g.fader)||g.fader< -144||g.fader>10||!Number.isInteger(g.col)||g.col<0||g.col>15))add('error','Configuration de groupe M32 invalide.',null,'groups');
 for(const [key,a]of Object.entries(s.groupAssignments||{})){const[kind,n]=key.split('.');if(!consoleProfile(s).strips[kind]||!Number.isInteger(Number(n))||Number(n)<1||Number(n)>consoleProfile(s).strips[kind]||!a||!Array.isArray(a.dcas)||!Array.isArray(a.mutes)||a.dcas.some(n=>!Number.isInteger(n)||n<1||n>8)||a.mutes.some(n=>!Number.isInteger(n)||n<1||n>6))add('error',`Affectation M32 invalide : ${key}.`,null,'groups');}
 if(!s.outputs.length)add('warning','Aucune sortie physique configurée.',null,'outputs');
 if(!issues.some(i=>i.level==='error'&&i.tab==='outputs'))try{planM32Outputs(s);}catch(e){add('error',e.message,null,'outputs');}
 return issues;
}
function neutralScene(){
 const nodes=new Map(),set=(p,v)=>nodes.set(p,String(v));
 for(const [kind,count]of [['chlink',16],['auxlink',4],['fxlink',4],['buslink',8],['mtxlink',3],['mute',6]])set(`/config/${kind}`,Array(count).fill(kind==='fxlink'?'ON':'OFF').join(' '));
 set('/config/linkcfg','ON ON ON ON');set('/config/mono','LR+M OFF');set('/config/routing','REC');set('/config/routing/IN','UIN1-8 UIN9-16 UIN17-24 UIN25-32 AUX1-4');set('/config/routing/PLAY','UIN1-8 UIN9-16 UIN17-24 UIN25-32 AUX1-4');set('/config/routing/OUT','OUT1-4 OUT5-8 OUT9-12 OUT13-16');
 for(const [kind,count]of Object.entries(consoleProfile('m32').strips))for(let n=1;n<=count;n++){
  const p=stripPath(kind,n),channels=['CH','AUX','FXR'].includes(kind),bands=channels?4:6;
  set(`${p}/config`,`${text('')} 1 WH${kind==='CH'?' 0':kind==='AUX'?` ${32+n}`:''}`);
  if(kind==='CH'){set(`${p}/delay`,'OFF 0.3');set(`${p}/preamp`,'0.0 OFF OFF 24 80');set(`${p}/gate`,'OFF GATE -80.0 60.0 10 50 200 0');set(`${p}/gate/filter`,'OFF 3.0 1000');set(`${p}/automix`,'OFF 0.0');}
  if(kind==='AUX')set(`${p}/preamp`,'0.0 OFF');if(kind==='MTX')set(`${p}/preamp`,'OFF');
  if(!['AUX','FXR'].includes(kind)){set(`${p}/dyn`,'OFF COMP PEAK LOG 0.0 3.0 2 0.0 10 10 150 POST 0 100 OFF');set(`${p}/dyn/filter`,'OFF 3.0 1000');set(`${p}/insert`,'OFF POST OFF');}
  set(`${p}/eq`,'OFF');for(let b=1;b<=bands;b++)set(`${p}/eq/${b}`,`PEQ ${[100,400,1000,4000,8000,12000][b-1]} 0.0 1.0`);
  set(`${p}/mix`,kind==='MAIN'?(n===1?'OFF -oo 0':'OFF -oo'):kind==='MTX'?'OFF -oo':'OFF -oo OFF 0 OFF -oo');
  if(kind!=='MTX')for(let d=1;d<=(channels?16:6);d++)set(`${p}/mix/${pad(d)}`,`OFF -oo${d%2?' 0 POST 0':''}`);
  set(`${p}/grp`,'%00000000 %000000');
 }
 for(let n=0;n<128;n++)set(`/headamp/${String(n).padStart(3,'0')}`,'0.0 OFF');
 for(let n=1;n<=8;n++){set(`/dca/${n}`,'ON 0.0');set(`/dca/${n}/config`,'"" 1 WH');set(`/fx/${n}`,'GEQ2');set(`/fx/${n}/par`,Array(64).fill('0.0').join(' '));if(n<=4)set(`/fx/${n}/source`,'INS INS');}
 for(const [kind,count]of [['main',16],['p16',16],['aux',6],['aes',2],['rec',2]])for(let n=1;n<=count;n++){set(`/outputs/${kind}/${pad(n)}`,'0 POST OFF');if(kind==='main')set(`/outputs/main/${pad(n)}/delay`,'OFF 0.3');}
 return nodes;
}
export function exportM32Scene(s){
 if(!isM32(s))throw new Error('Ce show utilise une autre famille de console. Créez un show M32.');const errors=validateM32(s).filter(i=>i.level==='error');if(errors.length)throw new Error(errors.map(i=>i.text).join('\n'));
 const nodes=neutralScene(),set=(p,v)=>nodes.set(p,String(v)),userIn=Array(32).fill(0),links={chlink:Array(16).fill('OFF'),buslink:Array(8).fill('OFF'),mtxlink:Array(3).fill('OFF')};
 const groups=(kind,n,fallback)=>{const a=s.groupAssignments?.[`${kind}.${n}`]?getAssignment(s,`${kind}.${n}`):fallback||getAssignment(s,`${kind}.${n}`);set(`${stripPath(kind,n)}/grp`,`${bits(a.dcas,8)} ${bits(a.mutes,6)}`);};
 const sends=(p,srcKey,fields,pan=0)=>{for(const [kind,field]of fields)for(const [n,send]of Object.entries(field||{})){const dst=getMixes(s).find(m=>m.source===kind&&m.bus===Number(n)),width=dst?logicalWidth(s,dst):1;for(let side=0;side<width;side++){const d=Number(n)+side;set(`${p}/mix/${pad(d)}`,`${on(send.on)} ${level(send.tap==='GRP'?0:send.level)}${d%2?` ${pan} ${send.tap} 0`:''}`);if(!(d%2)){const odd=`${p}/mix/${pad(d-1)}`,old=parseTokens(nodes.get(odd));old[3]=send.tap;set(odd,old.join(' '));}}}};
 for(const c of s.channels){const width=logicalWidth(s,c),a=getAssignment(s,`CH.${c.n}`);if(width===2)links.chlink[(c.n-1)/2]='ON';for(let side=0;side<width;side++){
  const n=c.n+side,p=stripPath('CH',n);userIn[n-1]=sourceId(c.bank,c.input+side);const ha=headampId(c.bank,c.input+side);if(Number.isFinite(ha))set(`/headamp/${String(ha).padStart(3,'0')}`,`${c.gain.toFixed(1)} ${on(c.phantom)}`);
  set(`${p}/config`,`${text(c.name)} 1 ${color[c.category]||'WH'} ${n}`);set(`${p}/preamp`,`0.0 OFF ${on(c.hpf>0)} 24 ${c.hpf||80}`);
  const mono=c.mainSends?.[2]||{on:false,level:-144},pan=width===2?(side?Math.min(100,100+c.pan*2):Math.max(-100,-100+c.pan*2)):c.pan;
  set(`${p}/mix`,`${on(!c.mute)} ${level(c.fader)} ${on(c.main)} ${pan} ${on(mono.on)} ${level(mono.level)}`);sends(p,`CH.${n}`,[['BUS',c.sends]],pan);groups('CH',n,a);
 }}
 for(const m of getMixes(s)){const width=logicalWidth(s,m),a=getAssignment(s,`${m.source}.${m.bus}`);if(width===2&&m.source!=='MAIN')links[m.source==='BUS'?'buslink':'mtxlink'][(m.bus-1)/2]='ON';for(let side=0;side<width;side++){const n=m.bus+side,p=stripPath(m.source,n);set(`${p}/config`,`${text(m.name)} 1 ${m.source==='MAIN'?'WH':m.source==='BUS'?'CY':'MG'}`);const mono=m.mainSends?.[2]||{on:false,level:-144};set(`${p}/mix`,m.source==='MAIN'?(n===1?`${on(!m.mute)} ${level(m.fader)} 0`:`${on(!m.mute)} ${level(m.fader)}`):m.source==='MTX'?`${on(!m.mute)} ${level(m.fader)}`:`${on(!m.mute)} ${level(m.fader)} ${on(m.mainSends?.[1]?.on)} ${width===2?(side?100:-100):0} ${on(mono.on)} ${level(mono.level)}`);if(m.source!=='MTX')sends(p,`${m.source}.${n}`,[['MTX',m.matrixSends]],width===2?(side?100:-100):0);groups(m.source,n,a);}}
 for(const [key,values]of Object.entries(links))set(`/config/${key}`,values.join(' '));set('/config/userrout/in',userIn.join(' '));
 const out=planM32Outputs(s);for(const [kind,values]of [['main',out.main],['p16',out.p16],['aux',out.aux],['aes',out.aes]])values.forEach((v,i)=>set(`/outputs/${kind}/${pad(i+1)}`,`${v?.code||0} ${v?.tap||'POST'} OFF`));set('/config/userrout/out',out.userOut.join(' '));const local=out.routing.LCL.flatMap(token=>{const start=Number(token.match(/UOUT(\d+)/)[1]);return [`UOUT${start}-${start+3}`,`UOUT${start+4}-${start+7}`];});set('/config/routing/OUT',local.join(' '));for(const [bank,key]of [['A','AES50A'],['B','AES50B'],['USB','CARD']])set(`/config/routing/${key}`,out.routing[bank].join(' '));
 for(const g of s.groups?.dca||[]){set(`/dca/${g.n}`,`${on(!g.mute)} ${level(g.fader)}`);set(`/dca/${g.n}/config`,`${text(g.name)} 1 ${colorNames[g.col]||'WH'}`);}set('/config/mute',Array.from({length:6},(_,i)=>on(s.groups?.mute?.find(g=>g.n===i+1)?.mute)).join(' '));
 for(const key of Object.keys(s.groupAssignments||{})){const [kind,n]=key.split('.');groups(kind,Number(n));}
 const resetFx=[];
 for(const f of s.fx){
  // Changing algorithm in the native reader initializes its own parameter layout.
  // Imported parameters are retained verbatim only while the algorithm is unchanged.
  set(`/fx/${f.slot}`,f.model);nodes.delete(`/fx/${f.slot}/par`);const previous=s.m32Template&&parseM32Scene(s.m32Template);if(f.nativeParameters?.family==='m32'&&f.nativeParameters.model===f.model&&Array.isArray(f.nativeParameters.values)&&f.nativeParameters.values.length&&f.nativeParameters.values.every(Number.isFinite))set(`/fx/${f.slot}/par`,f.nativeParameters.values.join(' '));else if(previous?.get(`/fx/${f.slot}`)===f.model&&previous.has(`/fx/${f.slot}/par`))set(`/fx/${f.slot}/par`,previous.get(`/fx/${f.slot}/par`));else resetFx.push(`/fx/${f.slot} ${f.model==='GEQ2'?'GEQ':'GEQ2'}`);
  if(f.usage==='send'){set(`/fx/${f.slot}/source`,`MIX${f.sendLeft} MIX${f.sendRight}`);for(let side=0;side<2;side++){const n=(f.slot-1)*2+1+side,p=stripPath('FXR',n),mono=f.mainSends?.[2]||{on:false,level:-144};set(`${p}/config`,`${text(`FX${f.slot} ${m32EffectInfo(f.model).name}`)} 1 MG`);set(`${p}/mix`,`${on(!f.returnMute)} ${level(f.returnLevel)} ${on(f.main!==false)} ${side?100:-100} ${on(mono.on)} ${level(mono.level)}`);sends(p,`FXR.${n}`,[['BUS',f.sends]],side?100:-100);}}
  else{if(f.slot<=4)set(`/fx/${f.slot}/source`,'INS INS');const target=f.target==='CH'?s.channels.find(c=>c.n===f.targetN):getMixes(s).find(m=>m.source===f.target&&m.bus===f.targetN),width=target?logicalWidth(s,target):1;for(let side=0;side<width;side++)set(`${stripPath(f.target,f.targetN+side)}/insert`,`${on(!f.bypass)} ${f.position==='preins'?'PRE':'POST'} FX${f.slot}${side?'R':'L'}`);if(f.rightTarget){const [kind,n]=f.rightTarget.split('.');set(`${stripPath(kind,Number(n))}/insert`,`${on(!f.bypass)} ${f.position==='preins'?'PRE':'POST'} FX${f.slot}R`);}}
 }
 for(const c of s.channels)for(let side=0;side<logicalWidth(s,c);side++)applyM32Processing(nodes,stripPath('CH',c.n+side),c.nativeProcessingM32,side);
 for(const m of getMixes(s))for(let side=0;side<logicalWidth(s,m);side++)applyM32Processing(nodes,stripPath(m.source,m.bus+side),m.nativeProcessingM32,side);
 return `#4.0# ${text(s.name,16)} ${text(s.artist,16)} %000000000 1\n${resetFx.join('\n')}${resetFx.length?'\n':''}${[...nodes].map(([path,value])=>`${path} ${value}`).join('\n')}\n`;
}

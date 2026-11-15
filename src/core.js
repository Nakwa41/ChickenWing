import {wingInsertAssignments,wingInsertSlot} from './wing-inserts.js';
import {CONSOLES,consoleProfile,ioCapacity,nextFreeNumber,isM32,isYamaha,isDM3} from './consoles.js';
import {validateYamaha} from './yamaha.js';
import {validateM32} from './m32.js';
import {initializeGroups,importGroups,exportGroups} from './groups.js';
export const BANKS = { LCL: 'Local', AUX: 'Aux', A: 'AES50 A', B: 'AES50 B', C: 'AES50 C', USB: 'USB', SC: 'StageConnect', CRD: 'WING-LIVE', MOD: 'Module', AES: 'AES/EBU', DANTE:'Dante', SLOT1:'Slot 1', SLOT2:'Slot 2', SLOT3:'Slot 3' };
export const COLORS = { Batterie: '#e3a854', Basse: '#bd8de6', Guitares: '#77aaed', Claviers: '#57c8bb', Voix: '#e28291', Autres: '#9aa3af' };
// WING's indexed palette, separate from the application's display colors.
export const PALETTE = { Batterie: 9, Basse: 12, Guitares: 5, Claviers: 6, Voix: 2, Autres: 1 };
export {FX_MODELS} from './effects.js';
import {FX_MODELS,effectAllowed} from './effects.js';
import {getMixes,mixKey,makeMix} from './routing.js';
import {microphoneStatus,recommendation,phantomCapable,validMicProfile} from './microphones.js';
export const uid = () => globalThis.crypto?.randomUUID?.() || `cw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const clone = (v) => structuredClone(v);
export function capacity(bank, model = 'wing', output = false) {
  return ioCapacity(bank,model,output);
}
export function channel(n, props = {}) {
  return {id:uid(), n, name:`Voie ${n}`, mic:'', category:'Autres', bank:'A', input:n, mode:'M', phantom:false, gain:0, hpf:0, dca:0, mute:true, fader:-144, pan:0, main:true, sends:{}, mainSends:{}, referenceN:null, reviewed:true, ...props};
}
export function newShow(name='Nouveau show') {
  return {id:uid(),name,artist:'',venue:'',date:'',model:'wing',notes:'',channels:[],outputs:[],fx:[],mixes:[],snapshots:[],files:[],created:Date.now(),updated:Date.now(),template:null, demo:false};
}
export function demoShow() {
  const s=newShow('Sourd Agency - Live Session'); Object.assign(s,{artist:'Michel Jason',venue:'Dans la haie - Blois',date:'2012-12-13',demo:true});
  const rows=[['Kick In','Beta 91A','Batterie',true],['Kick Out','Beta 52A','Batterie'],['Snare Top','SM57','Batterie'],['Snare Bottom','e904','Batterie'],['Hi-Hat','KM184','Batterie',true],['Tom 1','e904','Batterie'],['Tom 2','e904','Batterie'],['Floor Tom','e904','Batterie'],['Overhead','C414 · paire','Batterie',true,'ST'],['Bass DI','Radial J48','Basse',true],['Bass Amp','MD421','Basse'],['Guitar SL','SM57','Guitares'],['Guitar SR','e906','Guitares'],['Acoustic','DI active','Guitares',true],['Keys','DI stéréo','Claviers',false,'ST'],['Synth','DI stéréo','Claviers',false,'ST'],['Tracks','USB playback','Claviers',false,'ST'],['Lead Vocal','Beta 58A','Voix'],['Backing SL','SM58','Voix'],['Backing SR','SM58','Voix'],['Talkback','SM58','Autres']];
  let p=1;
  s.channels=rows.map((r,i)=>{if(r[4]&&p%2===0)p++;let c=channel(i+1,{name:r[0],mic:r[1],category:r[2],phantom:!!r[3],mode:r[4]||'M',input:p,hpf:i===0?35:i<8?70:100});p+=c.mode==='M'?1:2;return c;});
  s.outputs=[['Lead · Wedge','Wedge','M',1],['Guitare · Wedge','Wedge','M',2],['Basse · IEM','IEM','ST',3],['Batterie · IEM','IEM','ST',5],['Claviers · IEM','IEM','ST',7]].map((r,i)=>({id:uid(),name:r[0],type:r[1],mode:r[2],source:'BUS',bus:i+1,bank:'A',port:r[3],tap:'PRE',mute:true,fader:-144}));
  s.outputs.push({id:uid(),name:'Main LR',type:'Main',mode:'ST',source:'MAIN',bus:1,bank:'LCL',port:7,tap:'POST',mute:true,fader:-144});
  s.fx=[{id:uid(),slot:1,model:'PLATE',target:'BUS',targetN:15,position:'postins',mix:100},{id:uid(),slot:2,model:'ST-DL',target:'BUS',targetN:16,position:'postins',mix:100}];
  s.mixes=[makeMix('BUS',15,{name:'FX Plate',type:'FX'}),makeMix('BUS',16,{name:'FX Delay',type:'FX'})];
  return s;
}
export function nextChannel(s,mode='M') {return nextFreeNumber(s,'CH',mode);}
export function nextInput(s,bank='A',mode='M') {
  const used=new Set(s.channels.filter(c=>c.bank===bank).flatMap(c=>c.mode==='M'?[c.input]:[c.input,c.input+1]));
  return Array.from({length:capacity(bank,s)},(_,i)=>i+1).find(n=>!used.has(n)&&(mode==='M'||((isYamaha(s)||n%2===1)&&!used.has(n+1)))) || 1;
}
export function validate(s) {
  if(isYamaha(s))return validateYamaha(s);
  if(isM32(s))return validateM32(s);
  const issues=[];const used=new Map();const outs=new Map();const nums=new Set();
  const add=(level,text,id,tab='inputs')=>issues.push({level,text,id,tab});
  if(!s.channels.length)add('warning','Aucune voie d’entrée configurée.');
  for(const c of s.channels){
    if(!c.name.trim())add('error',`CH ${c.n} : le nom est vide.`,c.id);
    if(c.n<1||c.n>40||!Number.isInteger(c.n)||nums.has(c.n))add('error',`Numéro de voie invalide ou dupliqué : ${c.n}.`,c.id);nums.add(c.n);
    if(!['M','ST','M/S'].includes(c.mode))add('error',`${c.name} : mode de source invalide.`,c.id);
    if(!BANKS[c.bank])add('error',`${c.name} : banque de source inconnue.`,c.id);
    if(!Number.isInteger(c.input)||c.input<1||c.input+(c.mode==='M'?0:1)>capacity(c.bank,s))add('error',`${c.name} : entrée hors capacité ${BANKS[c.bank]||c.bank}.`,c.id);
    if(c.mode!=='M'&&c.input%2===0)add('error',`${c.name} : une paire stéréo/M/S doit commencer sur une entrée impaire.`,c.id);
    for(const input of c.mode==='M'?[c.input]:[c.input,c.input+1]){const key=`${c.bank}.${input}`;if(used.has(key)){const previous=used.get(key);const shared=previous.input===c.input&&previous.mode===c.mode&&previous.gain===c.gain&&previous.phantom===c.phantom;add(shared?'warning':'error',`${c.name} et ${previous.name} ${shared?'partagent la source':'ont des réglages incompatibles sur'} ${BANKS[c.bank]} ${input}.`,c.id);}else used.set(key,c);}
    if(c.phantom&&!['LCL','A','B','C'].includes(c.bank))add('error',`${c.name} : le 48 V ne s’applique pas à cette source.`,c.id);
    if(c.phantomMode==='auto'){
      const m=microphoneStatus(c).model;
      if(m&&recommendation(m,c.powerChoice)&&!phantomCapable(c))add('warning',`${c.name} : prévoir le 48 V sur le préampli en amont de ${BANKS[c.bank]}.`,c.id);
      if(m&&['adapter','split'].includes(m.power))add('warning',`${c.name} : vérifier l’adaptateur et les entrées séparées indiqués dans la fiche du ${m.model}.`,c.id);
      if(m?.channels===2&&c.mode==='M')add('warning',`${c.name} : modèle à deux sorties, compléter le patch du second canal ou choisir une source stéréo.`,c.id);
    }
    if(c.gain< -3||c.gain>45.5||!Number.isFinite(c.gain))add('error',`${c.name} : gain hors plage (−3 à +45,5 dB).`,c.id);
    if(!Number.isFinite(c.fader)||c.fader< -144||c.fader>10||typeof c.mute!=='boolean')add('error',`${c.name} : fader ou mute invalide.`,c.id);
    if(!Number.isFinite(c.hpf)||c.hpf<0||c.hpf>20000||!Number.isInteger(c.dca)||c.dca<0||c.dca>16||!Number.isFinite(c.pan)||Math.abs(c.pan)>100)add('error',`${c.name} : coupe-bas, DCA ou panoramique invalide.`,c.id);
    for(const [bus,send] of Object.entries(c.sends||{}))if(!/^\d+$/.test(bus)||Number(bus)<1||Number(bus)>16||!Number.isFinite(send.level)||send.level< -144||send.level>10||!['PRE','POST','GRP'].includes(send.tap))add('error',`${c.name} : envoi ${bus} invalide.`,c.id,'routing');
    if(!c.reviewed)add('warning',`${c.name} : information importée à vérifier.`,c.id);
    if(c.name.length>16)add('warning',`${c.name} : le nom sera limité à 16 caractères dans la WING.`,c.id);
  }
  const sources=new Set();
  for(const o of s.outputs){
    if(o.fader!==undefined&&(!Number.isFinite(o.fader)||o.fader< -144||o.fader>10))add('error',`${o.name} : fader de sortie hors plage.`,o.id,'outputs');
    if(typeof o.name!=='string'||!o.name.trim())add('error','Une sortie doit avoir un nom.',o.id,'outputs');
    if(!['BUS','MAIN','MTX'].includes(o.source)||o.bus<1||o.bus>({BUS:16,MAIN:4,MTX:8}[o.source]||0)||!Number.isInteger(o.bus))add('error',`${o.name} : bus ou source invalide.`,o.id,'outputs');
    if(!['M','ST'].includes(o.mode)||!BANKS[o.bank]||!Number.isInteger(o.port)||o.port<1||o.port+(o.mode==='ST'?1:0)>capacity(o.bank,s,true))add('error',`${o.name} : sortie hors capacité.`,o.id,'outputs');
    const key=`${o.source}.${o.bus}`; if(sources.has(key))add('error',`${o.name} : ce bus est déjà configuré dans une autre ligne.`,o.id,'outputs'); sources.add(key);
    for(const p of o.mode==='ST'?[o.port,o.port+1]:[o.port]){const key=`${o.bank}.${p}`;if(outs.has(key))add('error',`${o.name} et ${outs.get(key)} utilisent la sortie ${BANKS[o.bank]} ${p}.`,o.id,'outputs');else outs.set(key,o.name);}
  }
  const slots=new Set(), targets=new Set();
  for(const m of s.mixes||[]){const key=mixKey(m);if(sources.has(key))add('error',`${key} : numéro de bus déjà occupé.`,m.id,'routing');sources.add(key);if(!['BUS','MAIN','MTX',...(isDM3(s)?['FXB']:[])].includes(m.source)||!Number.isInteger(m.bus)||m.bus<1||m.bus>(({BUS:16,MAIN:4,MTX:8})[m.source])||!m.name?.trim())add('error','Configuration de bus interne invalide.',m.id,'routing');}
  for(const src of [...s.channels,...s.outputs,...(s.mixes||[])])for(const [n,send]of Object.entries(src.mainSends||{}))if(!Number.isInteger(Number(n))||Number(n)<1||Number(n)>4||!Number.isFinite(send.level)||send.level< -144||send.level>10||!['PRE','POST'].includes(send.tap))add('error',`${src.name} : assignation Main ${n} invalide.`,src.id,'routing');
  for(const fx of s.fx){
    if(slots.has(fx.slot)||fx.slot<1||fx.slot>16)add('error',`FX ${fx.slot} : slot dupliqué ou invalide.`,fx.id,'fx');slots.add(fx.slot);
    const key=`${fx.target}.${fx.targetN}.${fx.position}`;
    if(targets.has(key))add('error',`Plusieurs effets occupent l’insert ${key}.`,fx.id,'fx');targets.add(key);
    if(!FX_MODELS[fx.model])add('error',`FX ${fx.slot} : modèle non pris en charge par l’éditeur.`,fx.id,'fx');
    if(!['preins','postins'].includes(fx.position)||!Number.isInteger(fx.targetN)||fx.targetN<1||fx.targetN>({CH:40,BUS:16,MAIN:4,MTX:8}[fx.target]||0)||!Number.isFinite(fx.mix)||fx.mix<0||fx.mix>100)add('error',`FX ${fx.slot} : destination ou mix invalide.`,fx.id,'fx');
    if(FX_MODELS[fx.model]&&!effectAllowed(fx.model,fx.slot))add('error',`FX ${fx.slot} : cet algorithme nécessite un slot premium (1 à 8).`,fx.id,'fx');
  }
  if(!s.outputs.length)add('warning','Aucune sortie physique configurée.',null,'outputs');
  for(const [type,max]of [['dca',16],['mute',8]])for(const g of s.groups?.[type]||[]){
    if(!Number.isInteger(g.n)||g.n<1||g.n>max||typeof g.name!=='string'||type==='mute'&&!g.name.trim()||typeof g.mute!=='boolean'||type==='dca'&&(!Number.isFinite(g.fader)||g.fader< -144||g.fader>10||!Number.isInteger(g.col)||g.col<0||g.col>255))add('error','Configuration de groupe invalide.',null,'groups');
    else if(g.name.length>8)add('warning',`${type==='dca'?'DCA':'Mute'} ${g.n} : nom limité à 8 caractères dans la WING.`,null,'groups');
  }
  for(const [key,a]of Object.entries(s.groupAssignments||{}))if(!/^(CH|AUX|BUS|MAIN|MTX)\.\d+$/.test(key)||Number(key.split('.')[1])<1||Number(key.split('.')[1])>({CH:40,AUX:8,BUS:16,MAIN:4,MTX:8}[key.split('.')[0]])||!a||!Array.isArray(a.dcas)||!Array.isArray(a.mutes)||a.dcas.some(n=>!Number.isInteger(n)||n<1||n>16)||a.mutes.some(n=>!Number.isInteger(n)||n<1||n>8))add('error',`Affectation de groupe invalide : ${key}.`,null,'groups');
  return issues;
}
export function exportSnapshot(s, baseline) {
  if(isYamaha(s))throw new Error('Pour un show Yamaha, utilisez l’export natif Yamaha.');
  if(isM32(s))throw new Error('Pour un show M32, utilisez l’export de scène .scn.');
  const errors=validate(s).filter(i=>i.level==='error');if(errors.length)throw new Error(errors.map(i=>i.text).join('\n'));
  const snap=clone(s.template||baseline);if(!snap?.ae_data||!/^snapshot\./.test(snap.type||''))throw new Error('Snapshot de référence invalide.');
  const ae=snap.ae_data;const ensure=(o,k)=>o[k]??=( {} );
  // Clear formerly managed assignments before applying moves and deletions.
  // Unknown data and physical output mirrors remain untouched.
  for(const n of s.managedOriginal?.channels||[]){
    if(s.channels.some(c=>c.n===n))continue;
    const ch=ae.ch?.[n];if(!ch)continue;ch.mute=true;ch.fdr=-144;
    if(ch.in?.conn)ch.in.conn.grp='OFF';
    for(const send of Object.values(ch.send||{}))send.on=false;
    for(const main of Object.values(ch.main||{}))main.on=false;
  }
  for(const o of s.managedOriginal?.outputs||[]){
    const ports=ae.io?.out?.[o.bank];if(!ports)continue;
    ports[o.port]={grp:'OFF',in:1};if(o.mode==='ST')ports[o.port+1]={grp:'OFF',in:1};
  }
  for(const m of s.managedOriginal?.mixes||[])if(!getMixes(s,{allMains:false}).some(v=>mixKey(v)===mixKey(m))){const strip=ae[({BUS:'bus',MAIN:'main',MTX:'mtx'})[m.source]]?.[m.bus];if(strip){strip.mute=true;strip.fdr=-144;for(const v of Object.values(strip.main||{}))v.on=false;for(const v of Object.values(strip.send||{}))v.on=false;}}
  for(const fx of s.managedOriginal?.fx||[]){
    const group=({CH:'ch',BUS:'bus',MAIN:'main',MTX:'mtx'})[fx.target];
    const insert=ae[group]?.[fx.targetN]?.[fx.position];if(insert)Object.assign(insert,{on:false,ins:'NONE'});
    if(!s.fx.some(f=>f.slot===fx.slot))ae.fx[fx.slot]={mdl:'NONE',fxmix:100};
  }
  // Only managed channels, physical sources, outputs and inserts are overwritten on an imported template.
  for(const c of s.channels){
    const ch=clone((c.referenceN&&s.template?.ae_data?.ch?.[c.referenceN])||baseline.ae_data?.ch?.[c.n]||{});ensure(ae,'ch')[c.n]=ch;
    Object.assign(ch,{name:c.name.slice(0,16),col:PALETTE[c.category]||1,clink:false,mute:c.mute,fdr:c.fader,pan:c.pan});
    const ins=ensure(ch,'in');Object.assign(ensure(ins,'conn'),{grp:c.bank,in:c.input});
    Object.assign(ensure(ch,'flt'),{lc:c.hpf>0,lcf:c.hpf||100});
    for(let n=1;n<=4;n++)Object.assign(ensure(ensure(ch,'main'),String(n)),{on:n===1?c.main:false,lvl:0,pre:false});
    // Preserve non-DCA tags from the template.
    ch.tags=(String(ch.tags||'').replace(/#D\d+\b/g,'').trim()+(c.dca?` #D${c.dca}`:'')).trim();
    for(const p of c.mode==='M'?[c.input]:[c.input,c.input+1]){
      const input=ensure(ensure(ensure(ensure(ae,'io'),'in'),c.bank),String(p));
      Object.assign(input,{mode:c.mode,name:c.name.slice(0,16),col:PALETTE[c.category]||1});
      if(['LCL','A','B','C'].includes(c.bank))Object.assign(input,{g:c.gain,vph:c.phantom});
    }
    for(let n=1;n<=16;n++)Object.assign(ensure(ensure(ch,'send'),String(n)),{on:false,lvl:-144});
    for(const [bus, send]of Object.entries(c.sends||{}))Object.assign(ensure(ensure(ch,'send'),bus),{on:send.on,lvl:send.level,mode:send.tap||'PRE',pan:0,plink:0});
  }
  for(const o of [...s.outputs,...(s.mixes||[])]){
    const group=({BUS:'bus',MAIN:'main',MTX:'mtx'})[o.source];
    const strip=clone((o.referenceN&&s.template?.ae_data?.[group]?.[o.referenceN])||baseline.ae_data?.[group]?.[o.bus]||{});ensure(ae,group)[o.bus]=strip;
    Object.assign(strip,{name:o.name.slice(0,16),busmono:o.busMono??o.mode==='M',mute:o.mute??true,fdr:o.fader??-144});
    if(!o.bank)continue;
    const entries=ensure(ensure(ensure(ae,'io'),'out'),o.bank);
    entries[o.port]={grp:o.source,in:(o.bus-1)*2+(o.mode==='M'&&o.side==='R'?2:1)};
    if(o.mode==='ST')entries[o.port+1]={grp:o.source,in:o.bus*2};
  }
  for(const c of s.channels)for(const [n,send]of Object.entries(c.mainSends||{}))Object.assign(ensure(ensure(ae.ch[c.n],'main'),n),{on:n==='1'?c.main:send.on,lvl:send.level,pre:send.tap==='PRE'});
  for(const m of getMixes(s,{allMains:false})){const strip=ensure(ensure(ae,({MAIN:'main',BUS:'bus',MTX:'mtx'})[m.source]),String(m.bus));if(m.source==='BUS'){for(let n=1;n<=16;n++)Object.assign(ensure(ensure(strip,'send'),String(n)),{on:false,lvl:-144});for(let n=1;n<=4;n++)Object.assign(ensure(ensure(strip,'main'),String(n)),{on:false,lvl:0,pre:false});}for(const [n,send]of Object.entries(m.mainSends||{}))Object.assign(ensure(ensure(strip,'main'),n),{on:send.on,lvl:send.level,pre:send.tap==='PRE'});for(const [n,send]of Object.entries(m.sends||{}))Object.assign(ensure(ensure(strip,'send'),n),{on:send.on,lvl:send.level,pre:send.tap==='PRE'});}
  for(const c of [...s.channels,...getMixes(s,{allMains:false})]){
    const group=c.n?'ch':({BUS:'bus',MAIN:'main',MTX:'mtx'})[c.source],strip=ensure(ensure(ae,group),String(c.n||c.bus));
    if(group==='mtx')continue;
    for(let n=1;n<=8;n++)Object.assign(ensure(ensure(strip,'send'),`MX${n}`),{on:false,lvl:-144,pre:false});
    for(const[n,send]of Object.entries(c.matrixSends||{}))Object.assign(ensure(ensure(strip,'send'),`MX${n}`),{on:send.on,lvl:send.level,pre:send.tap==='PRE'});
  }
  for(const old of s.managedOriginal?.fx||[])for(const group of ['ch','bus','main','mtx'])for(const strip of Object.values(ae[group]||{}))for(const pos of ['preins','postins'])if(strip[pos]?.ins===`FX${old.slot}`)Object.assign(strip[pos],{on:false,ins:'NONE'});
  for(const fx of s.fx){
    const rack=ensure(ae,'fx');
    if(fx.nativeParameters?.family==='wing'&&fx.nativeParameters.model===fx.model&&fx.nativeParameters.values?.mdl===fx.model)rack[fx.slot]=clone(fx.nativeParameters.values);
    if(rack[fx.slot]?.mdl!==fx.model)rack[fx.slot]={mdl:fx.model,fxmix:fx.mix};else rack[fx.slot].fxmix=fx.mix;
    const group=({CH:'ch',BUS:'bus',MAIN:'main',MTX:'mtx'})[fx.target];
    const strip=ensure(ensure(ae,group),String(fx.targetN));
    Object.assign(ensure(strip,fx.position),{on:fx.model!=='NONE'&&!fx.bypass,ins:`FX${fx.slot}`});
  }
  exportGroups(s,ae);
  return snap;
}
export function importSnapshot(snap,name='Snapshot WING') {
  if(!/^snapshot\./.test(snap?.type||'')||!snap.ae_data?.ch||Array.isArray(snap.ae_data.ch))throw new Error('Ce fichier n’est pas un snapshot WING reconnu.');
  const s=newShow(name.replace(/\.snap$/i,''));s.template=snap;const ae=snap.ae_data;
  for(const [n,ch] of Object.entries(ae.ch)){
    const conn=ch.in?.conn;if(!conn||conn.grp==='OFF'||!BANKS[conn.grp])continue;
    const src=ae.io?.in?.[conn.grp]?.[conn.in]||{};
    const sends=Object.fromEntries(Object.entries(ch.send||{}).filter(([k])=>/^\d+$/.test(k)).map(([k,v])=>[k,{on:!!v.on,level:v.lvl??-144,tap:v.mode||'PRE'}]));
    s.channels.push(channel(Number(n),{name:(ch.clink?src.name:ch.name)||src.name||`CH ${n}`,bank:conn.grp,input:conn.in,mode:src.mode||'M',phantom:!!src.vph,gain:src.g||0,mute:!!ch.mute,fader:ch.fdr??-144,pan:ch.pan||0,hpf:ch.flt?.lc?ch.flt.lcf:0,main:!!ch.main?.['1']?.on,dca:Number(ch.tags?.match(/#D(\d+)/)?.[1]||0),referenceN:Number(n),matrixSends:Object.fromEntries(Object.entries(ch.send||{}).filter(([k])=>/^MX\d+$/.test(k)).map(([k,v])=>[k.slice(2),{on:!!v.on,level:v.lvl??-144,tap:v.pre?'PRE':'POST'}])),mainSends:Object.fromEntries(Object.entries(ch.main||{}).map(([n,v])=>[n,{on:!!v.on,level:v.lvl??0,tap:v.pre?'PRE':'POST'}])),sends}));
  }
  // Collapse adjacent L/R assignments into one stereo output.
  const seen=new Set();
  for(const [bank,ports] of Object.entries(ae.io?.out||{})){
    if(!BANKS[bank])continue;
    for(const [p,port]of Object.entries(ports)){
      if(seen.has(`${bank}.${p}`)||!['BUS','MAIN','MTX'].includes(port.grp))continue;
      const bus=Math.ceil(port.in/2);const strip=ae[({BUS:'bus',MAIN:'main',MTX:'mtx'})[port.grp]]?.[bus]||{};
      const right=ports[Number(p)+1];const stereo=port.in%2===1&&right?.grp===port.grp&&right.in===port.in+1;
      if(stereo)seen.add(`${bank}.${Number(p)+1}`);
      // Only one editable configuration per logical bus. Additional physical mirrors stay in the template.
      if(s.outputs.some(o=>o.source===port.grp&&o.bus===bus))continue;
      s.outputs.push({id:uid(),name:strip.name||`${port.grp} ${bus}`,type:port.grp==='MAIN'?'Main':'Wedge',source:port.grp,bus,mode:stereo?'ST':'M',busMono:!!strip.busmono,side:port.in%2===0?'R':'L',bank,port:Number(p),tap:'PRE',mute:!!strip.mute,fader:strip.fdr??-144});
    }
  }
  for(const [group,source,count]of [['bus','BUS',16],['main','MAIN',4],['mtx','MTX',8]])for(let n=1;n<=count;n++){
    const native=ae[group]?.[n]||{};let m=s.outputs.find(o=>o.source===source&&o.bus===n);
    const incoming=source==='MTX'?s.channels.some(c=>c.matrixSends?.[n]?.on)||Object.values(ae.bus||{}).some(b=>b.send?.[`MX${n}`]?.on)||Object.values(ae.main||{}).some(b=>b.send?.[`MX${n}`]?.on):source==='BUS'?s.channels.some(c=>c.sends?.[n]?.on)||Object.values(ae.bus||{}).some(b=>b.send?.[n]?.on):s.channels.some(c=>c.mainSends?.[n]?.on)||Object.values(ae.bus||{}).some(b=>b.main?.[n]?.on);
    const active=incoming||native.name||native.fdr> -144||native.eq?.on||Object.values(native.main||{}).some(v=>v.on)||Object.values(native.send||{}).some(v=>v.on)||['preins','postins'].some(k=>wingInsertSlot(native[k]));
    if(!m&&active){m=makeMix(source,n,{name:native.name||`${source} ${n}`,mode:native.busmono?'M':'ST',fader:native.fdr??-144,mute:!!native.mute,referenceN:n});s.mixes.push(m);}
    if(m){m.referenceN=n;m.matrixSends=Object.fromEntries(Object.entries(native.send||{}).filter(([k])=>/^MX\d+$/.test(k)).map(([k,v])=>[k.slice(2),{on:!!v.on,level:v.lvl??-144,tap:v.pre?'PRE':'POST'}]));m.mainSends=Object.fromEntries(Object.entries(native.main||{}).map(([k,v])=>[k,{on:!!v.on,level:v.lvl??0,tap:v.pre?'PRE':'POST'}]));m.sends=Object.fromEntries(Object.entries(native.send||{}).filter(([k])=>/^\d+$/.test(k)).map(([k,v])=>[k,{on:!!v.on,level:v.lvl??-144,tap:v.pre?'PRE':'POST'}]));}
  }
  // Unsupported effect algorithms are preserved in the template without pretending to edit their parameters.
  for(const assignment of wingInsertAssignments(ae))if(FX_MODELS[assignment.model]&&!s.fx.some(f=>f.slot===assignment.slot))s.fx.push({id:uid(),...assignment});
  importGroups(s,ae);
  s.managedOriginal={channels:s.channels.map(c=>c.n),outputs:s.outputs.map(o=>({bank:o.bank,port:o.port,mode:o.mode})),mixes:getMixes(s,{allMains:false}).map(m=>({source:m.source,bus:m.bus})),fx:clone(s.fx)};
  return s;
}
export function assertProject(s) {
  if(!s||typeof s.name!=='string'||!Array.isArray(s.channels)||!Array.isArray(s.outputs)||!Array.isArray(s.fx)||s.channels.length>consoleProfile(s).channels||s.outputs.length>consoleProfile(s).buses+consoleProfile(s).mains+consoleProfile(s).matrices||s.fx.length>(isYamaha(s)?272:consoleProfile(s).fx))throw new Error('Le fichier de projet est invalide.');
  if(s.model!==undefined&&!CONSOLES[s.model])throw new Error('Le modèle de console du projet est invalide.');
  if(isM32(s)&&(s.groups?.dca?.length>8||s.groups?.mute?.length>6))throw new Error('Le projet dépasse les groupes disponibles sur M32.');
  if(isYamaha(s)&&s.stageboxes!==undefined&&(!Array.isArray(s.stageboxes)||s.stageboxes.length>24||s.stageboxes.some(b=>!b||typeof b.name!=='string'||typeof b.model!=='string'||typeof b.id!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(b.id))))throw new Error('Les stageboxes du projet Yamaha sont invalides.');
  const result={...newShow(),...s}; result.snapshots=Array.isArray(s.snapshots)?s.snapshots:[];result.files=Array.isArray(s.files)?s.files:[];
  for(const c of result.channels)if(typeof c.name!=='string'||!c.id||typeof c.n!=='number'||typeof c.bank!=='string')throw new Error('Une voie du projet est invalide.');
  for(const c of result.channels)if(c.micProfile&&!validMicProfile(c.micProfile))throw new Error('Une référence microphone du projet est invalide.');
  for(const o of result.outputs)if(!o||typeof o.name!=='string'||typeof o.id!=='string'||typeof o.bank!=='string'||typeof o.bus!=='number')throw new Error('Une sortie du projet est invalide.');
  for(const f of result.fx)if(!f||typeof f.id!=='string'||typeof f.slot!=='number'||typeof f.model!=='string')throw new Error('Un effet du projet est invalide.');
  for(const snap of result.snapshots)if(!snap||typeof snap.name!=='string'||!snap.data||!Array.isArray(snap.data.channels)||!Array.isArray(snap.data.outputs))throw new Error('Un snapshot du projet est invalide.');
  result.mixes=Array.isArray(s.mixes)?s.mixes:[];
  if(result.mixes.length>(consoleProfile(s).buses+consoleProfile(s).mains+consoleProfile(s).matrices+(isDM3(s)?2:0))||result.mixes.some(m=>!m||typeof m.id!=='string'||typeof m.name!=='string'||!['BUS','MAIN','MTX',...(isDM3(s)?['FXB']:[])].includes(m.source)||!Number.isInteger(m.bus)))throw new Error('Un bus interne du projet est invalide.');
  if(result.groups&&['dca','mute'].some(type=>!Array.isArray(result.groups[type])||result.groups[type].some(g=>!g||typeof g!=='object')))throw new Error('Les groupes du projet sont invalides.');
  initializeGroups(result);
  return result;
}

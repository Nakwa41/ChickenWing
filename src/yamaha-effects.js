import {yamahaEqCatalog,yamahaEqCapacity} from './yamaha-eq.js';
import {consoleModel,consoleProfile,isDM3,logicalWidth,occupiedNumbers} from './consoles.js';
import {YAMAHA_FX_PRESETS} from './yamaha-fx-data.js';
import {YAMAHA_PREMIUM_PRESETS} from './yamaha-premium-data.js';
export const yamahaFxFamily=s=>consoleModel(s).dm?(isDM3(s)?'dm3':'dm7'):'cl';
export const yamahaRack=f=>f.rack||'fx';
export function yamahaFxCapacity(s,rack='fx'){const model=consoleModel(s),dm3=isDM3(s),dm=!!model.dm;return {slots:['eq','channel'].includes(rack)?yamahaEqCapacity(s,rack):rack==='premium'?(dm3?0:dm?(model.dm==='dm7'?64:0)+(s.pyDsp?32:0):8):consoleProfile(s).fx,bankSize:rack==='premium'&&dm?16:0,inserts:dm3?0:dm?4:2,returnKind:dm3?'FX RTN':dm?'CH':'ST IN',returns:dm3?2:dm?Math.floor(consoleProfile(s).channels/2):8};}
const dmNames={RevHDHall:'HD Hall',RevHDRoom:'HD Room',RevHDPlate:'HD Plate',R3Hall:'R3 Hall',R3Room:'R3 Room',R3Plate:'R3 Plate',EarlyRef:'Early Ref.',GateReverb:'Gate Reverb',MonoDelay:'Mono Delay',StereoDelay:'Stereo Delay',PingPongDelay:'Ping Pong Delay',DelayLCR:'Delay LCR',Flange:'Flange',DualPitch:'Dual Pitch','Rev. HD Hall':'HD Hall','Rev. HD Room':'HD Room','Rev. HD Plate':'HD Plate','Rev. R3 Hall':'R3 Hall','Rev. R3 Room':'R3 Room','Rev. R3 Plate':'R3 Plate','Reverb Hall':'N2 Hall','Reverb Room':'N2 Room','Reverb Stage':'N2 Stage'};
const catalogCache=new Map();
export function yamahaFxCatalog(s,rack='fx'){if(['eq','channel'].includes(rack))return yamahaEqCatalog(s,rack);const family=yamahaFxFamily(s),key=family+':'+rack;if(!catalogCache.has(key)){const data=rack==='premium'?YAMAHA_PREMIUM_PRESETS:YAMAHA_FX_PRESETS;catalogCache.set(key,Object.values(data[family]||{}).map(p=>({...p,rack,name:dmNames[p.id]||p.id.replace(/ (?:Dual|Du)$/,' · Dual').replace(/ St$/,' · Stereo'),size:p.size||1,requiresRight:rack==='premium'?p.inputs===2&&p.id!=='REV-X':['COMP276','COMP276S','COMP260','COMP260S','EQUALIZER601','OPENDECK'].includes(p.id)})).sort((a,b)=>a.name.localeCompare(b.name)));}return catalogCache.get(key);}
export const yamahaEffectInfo=(s,id)=>[...yamahaFxCatalog(s),...yamahaFxCatalog(s,'premium'),...yamahaFxCatalog(s,'eq'),...yamahaFxCatalog(s,'channel')].find(f=>f.id===id);
export function yamahaEffectAllowed(s,id,slot){const f=yamahaEffectInfo(s,id);if(!f||f.referenceOnly||!Number.isInteger(slot))return false;const cap=yamahaFxCapacity(s,f.rack),end=slot+f.size-1;return slot>=1&&end<=cap.slots&&(!(f.rack==='fx'&&f.size===2||f.odd)||slot%2===1)&&(!cap.bankSize||Math.floor((slot-1)/cap.bankSize)===Math.floor((end-1)/cap.bankSize));}
export const yamahaFxSlots=(s,f)=>Array.from({length:yamahaEffectInfo(s,f.model)?.size||1},(_,i)=>f.slot+i);
export const yamahaFxUsed=(s,rack='fx')=>(s.fx||[]).filter(f=>yamahaRack(f)===rack).reduce((n,f)=>n+(yamahaEffectInfo(s,f.model)?.size||1),0);
export const yamahaReturnId=f=>f.slot+({premium:100,eq:200,channel:400}[yamahaRack(f)]||0);
export const yamahaSlotLabel=(s,f)=>yamahaRack(f)==='eq'?`EQ ${f.slot}`:yamahaRack(f)==='channel'?`EQ ${f.target} ${f.targetN}`:yamahaRack(f)==='premium'?`Premium ${consoleModel(s).dm?String.fromCharCode(97+Math.floor((f.slot-1)/16))+((f.slot-1)%16+1):f.slot}`:`FX ${f.slot}`;
export const yamahaReturnChannels=(s,f)=>consoleModel(s).dm&&!isDM3(s)&&f.usage==='send'?[f.returnN,f.returnN+1]:[];
export function freeYamahaReturn(s,ignoreId){const cap=yamahaFxCapacity(s),used=new Set(cap.returnKind==='CH'?s.channels.flatMap(c=>occupiedNumbers(s,c)):[]);for(const f of s.fx||[])if(f.id!==ignoreId&&f.usage==='send')for(const n of cap.returnKind==='CH'?[f.returnN,f.returnN+1]:[f.returnN])used.add(n);return Array.from({length:cap.returnKind==='CH'?consoleProfile(s).channels:cap.returns},(_,i)=>i+1).find(n=>!used.has(n)&&(cap.returnKind!=='CH'||n%2===1&&!used.has(n+1)))||0;}
export function freeYamahaSlot(s,model,ignoreId){const info=yamahaEffectInfo(s,model);if(!info)return 0;const used=new Set((s.fx||[]).filter(f=>yamahaRack(f)===info.rack&&f.id!==ignoreId).flatMap(f=>yamahaFxSlots(s,f)));return Array.from({length:yamahaFxCapacity(s,info.rack).slots},(_,i)=>i+1).find(n=>yamahaEffectAllowed(s,model,n)&&Array.from({length:info.size},(_,i)=>n+i).every(n=>!used.has(n)))||0;}
const targetRecord=(s,kind,n)=>kind==='CH'?s.channels.find(c=>c.n===n):[...s.outputs,...(s.mixes||[])].find(m=>m.source===kind&&m.bus===n);
export function yamahaInsertTargets(s,f){const result=[],record=targetRecord(s,f.target,f.targetN);if(!record)return result;const width=f.target==='MAIN'?(f.targetN===1||consoleModel(s).dm?2:1):logicalWidth(s,record),first=f.target==='MAIN'?(consoleModel(s).dm?(f.targetN-1)*2:f.targetN===1?0:2):f.targetN-1;for(let side=0;side<width;side++)result.push({kind:f.target,index:first+side,side,record});if(f.rightTarget){const [kind,raw]=f.rightTarget.split('.'),n=Number(raw),r=targetRecord(s,kind,n);if(r)result.push({kind,index:kind==='MAIN'?(consoleModel(s).dm?(n-1)*2:n===1?0:2):n-1,side:1,record:r});}return result;}
export function validateYamahaFx(s){
 const issues=[],p=consoleProfile(s),cap=yamahaFxCapacity(s),slots=new Set(),returns=new Set(),inserts=new Map(),add=(f,text)=>issues.push({level:'error',id:f?.id||null,tab:'fx',text:`${f?yamahaSlotLabel(s,f)+' : ':''}${text}`});
 if(s.pyDsp!==undefined&&typeof s.pyDsp!=='boolean')add(null,'configuration de la carte PY-DSP invalide.');
 for(const f of s.fx||[]){
  const info=yamahaEffectInfo(s,f.model),rack=yamahaRack(f);
  if(!info||info.rack!==rack||!yamahaEffectAllowed(s,f.model,f.slot))add(f,'algorithme ou emplacement incompatible avec cette console et ses ressources DSP.');
  for(const n of yamahaFxSlots(s,f)){const key=`${rack}.${n}`;if(slots.has(key))add(f,`l’emplacement ${n} est déjà occupé.`);slots.add(key);}
  if(!Number.isFinite(f.mix)||f.mix<0||f.mix>100||typeof f.bypass!=='boolean')add(f,'mix ou bypass invalide.');
  if(rack==='premium'&&f.mix!==100)add(f,'les paramètres Wet/Dry des Premium Racks se règlent dans l’éditeur Yamaha.');
  if(f.eqBands!==undefined){if(!Array.isArray(f.eqBands)||f.eqBands.length!==31||f.eqBands.some(v=>!Number.isFinite(v)||v< -15||v>15))add(f,'les gains GEQ doivent contenir 31 valeurs entre −15 et +15 dB.');else if(info?.maxActiveBands&&f.eqBands.filter(v=>v!==0).length>info.maxActiveBands)add(f,`${info.maxActiveBands} bandes réglables au maximum : réduisez le nombre de bandes actives ou choisissez un GEQ 31 bandes complet.`);}
  if(info?.allowedTargets&&!info.allowedTargets.includes(f.target))add(f,'ce traitement ne peut pas être affecté à cette famille de tranche.');
  if(['eq','channel'].includes(rack)&&f.usage==='send')add(f,'ce rack EQ utilise une insertion, sans envoi / retour.');
  if(f.usage==='channel-eq'){
   const record=targetRecord(s,f.target,f.targetN);if(rack!=='channel'||!record)add(f,'égaliseur de tranche ou destination invalide.');const key=`channel.${f.model}.${f.target}.${f.targetN}`;if(inserts.has(key))add(f,'ce module EQ de tranche est déjà utilisé.');inserts.set(key,f);
  }else if(f.usage==='send'){
   if(rack==='premium'&&!consoleModel(s).dm&&f.slot>2)add(f,'seuls les Premium Racks 1 et 2 acceptent un envoi / retour ; utilisez un insert pour les racks 3 à 8.');
   if(!Number.isFinite(f.returnLevel)||f.returnLevel< -144||f.returnLevel>10||typeof f.returnMute!=='boolean'||typeof f.main!=='boolean')add(f,'niveau ou mute du retour invalide.');
   if(!Number.isInteger(f.returnN)||f.returnN<1||(cap.returnKind==='CH'?(f.returnN%2!==1||f.returnN+1>p.channels):f.returnN>cap.returns)||isDM3(s)&&f.returnN!==f.slot)add(f,'retour stéréo hors capacité.');
   const rn=cap.returnKind==='CH'?[f.returnN,f.returnN+1]:[f.returnN];for(const n of rn){if(returns.has(n)||cap.returnKind==='CH'&&s.channels.some(c=>occupiedNumbers(s,c).includes(n)))add(f,`${cap.returnKind} ${n} est déjà utilisé.`);returns.add(n);}
   if(!isDM3(s))for(const [side,n]of [f.sendLeft,f.sendRight].entries()){if(!Number.isInteger(n)||n<(side?0:1)||n>p.buses)add(f,'source MIX hors capacité.');else if(n&&!s.outputs.concat(s.mixes||[]).some(m=>m.source==='BUS'&&occupiedNumbers(s,m).includes(n)))add(f,`créez le bus MIX ${n} dans Routing & envois.`);}
   if(info?.requiresRight&&!f.sendRight)add(f,'ce processeur nécessite les deux entrées ; affectez le même MIX des deux côtés pour une source mono.');
   if(info?.inputs===1&&f.sendRight)add(f,'ce processeur possède une seule entrée ; utilisez uniquement la source gauche.');
  }else if(f.usage==='insert'){
   if(!cap.inserts||!Number.isInteger(f.insertSlot)||f.insertSlot<1||f.insertSlot>cap.inserts||!['preins','postins'].includes(f.position))add(f,'point ou module d’insertion indisponible.');
   const record=targetRecord(s,f.target,f.targetN),targets=yamahaInsertTargets(s,f),width=targets.filter(t=>t.side===0||!f.rightTarget).length;
   if(!record||!['CH','BUS','MTX','MAIN'].includes(f.target))add(f,'la tranche de destination doit être configurée.');
   if(f.rightTarget&&(info?.items!==2||width>1||targets.length!==2||targets[1].record.mode!=='M'))add(f,'le côté B d’un processeur Dual peut traiter une seconde tranche mono.');
   if(info?.inputs===1&&targets.length>1)add(f,'ce processeur mono nécessite une tranche mono.');
   for(const t of targets){const k=`${t.kind}.${t.index}`,key=k+'.'+f.insertSlot;if(inserts.has(key))add(f,'ce module d’insertion est déjà utilisé.');inserts.set(key,f);const point=inserts.get(k);if(point&&point!==f.position)add(f,'les modules de cette tranche partagent le même point d’insertion.');inserts.set(k,f.position);}
  }else add(f,'utilisation inconnue.');
 }
 for(const rack of ['fx','premium','eq','channel'])if(yamahaFxUsed(s,rack)>yamahaFxCapacity(s,rack).slots)add(null,`la capacité du rack ${rack==='premium'?'Premium':'FX'} est dépassée.`);
 return issues;
}

// Native banks can be reused only within the exact family / algorithm / rack.
export function yamahaParameterValues(s,f,info,side=0){
 const bank=f.nativeParameters;
 if(bank?.family===yamahaFxFamily(s)&&bank.model===f.model&&(bank.rack||'fx')===yamahaRack(f)){
  const values=yamahaRack(f)==='premium'?bank.values?.[side]:bank.values;
  if(Array.isArray(values)&&values.length>=info.values.length&&values.every(Number.isFinite))return values;
 }
 return info.values;
}

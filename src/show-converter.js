import {wingInsertAssignments,wingChannelEqProcessors} from './wing-inserts.js';
import {newShow,clone,uid,validate,importSnapshot} from './core.js';
import {CONSOLES,consoleProfile,consoleModel,isM32,isYamaha,isDM3,pairedStereo,ioCapacity,logicalWidth,bankOptions} from './consoles.js';
import {makeMix,canRoute,getMixes} from './routing.js';
import {initializeGroups} from './groups.js';
import {matchEffect,fxFamily,FX_REFERENCE_VERSION} from './fx-equivalence.js';
import {m32EffectAllowed} from './m32-effects.js';
import {effectAllowed} from './effects.js';
import {freeYamahaSlot,freeYamahaReturn,yamahaEffectInfo,yamahaFxCapacity} from './yamaha-effects.js';
export function suggestedBankMap(source,target){const map={};for(const bank of new Set([...source.channels.map(c=>c.bank),...source.outputs.map(c=>c.bank)]))map[bank]=ioCapacity(bank,target)||ioCapacity(bank,target,true)?bank:'';return map;}
export function selectedChannelCount(source,targetModel,selectedIds){const ids=selectedIds?new Set(selectedIds):null;return source.channels.filter(c=>!ids||ids.has(c.id)).reduce((n,c)=>n+(pairedStereo(targetModel)&&c.mode!=='M'?2:1),0);}
const sendFields=[['sends','BUS'],['mainSends','MAIN'],['matrixSends','MTX'],['fxSends','FXB']];
export function planShowConversion(source,targetModel,options={}){
 if(!CONSOLES[targetModel])throw new Error('Console cible inconnue.');
 const original=clone(source);initializeGroups(original);
 // Recover bindings in projects imported by versions that ignored bypassed inserts.
 if(fxFamily(original)==='wing'&&original.template){const assignments=wingInsertAssignments(original.template.ae_data);let imported;
  for(const f of original.fx||[])if(f.usage==='unassigned'){const binding=assignments.find(a=>a.slot===f.slot&&a.model===f.model);if(!binding)continue;Object.assign(f,binding);
   if(binding.target!=='CH'&&!original.outputs.concat(original.mixes||[]).some(m=>m.source===binding.target&&m.bus===binding.targetN)){
    imported??=importSnapshot(original.template);const record=imported.outputs.concat(imported.mixes).find(m=>m.source===binding.target&&m.bus===binding.targetN);if(record)(original.mixes??=[]).push({...clone(record),id:uid(),bank:undefined,port:undefined});
   }
  }
 }const target=newShow(options.name||`${source.name} · ${CONSOLES[targetModel]}`);Object.assign(target,{model:targetModel,artist:source.artist||'',venue:source.venue||'',date:source.date||'',notes:source.notes||'',pyDsp:!!options.pyDsp});
 const p=consoleProfile(target),report={version:1,reference:FX_REFERENCE_VERSION,created:new Date().toISOString(),source:{model:source.model,name:source.name},target:{model:targetModel,name:target.name},issues:[],effects:[],channels:[],removedChannels:[],routing:[]};
 const issue=(level,text,area='conversion')=>report.issues.push({level,text,area});
 for(const item of original.importDiagnostics||[])if(!/EQ,.*(tranche|compresseurs)/.test(item.text))issue(item.level,item.text,'import');
 const ids=options.selectedIds?new Set(options.selectedIds):null,selected=original.channels.filter(c=>!ids||ids.has(c.id));
 for(const c of original.channels)if(ids&&!ids.has(c.id)){report.removedChannels.push({n:c.n,name:c.name});issue('info',`CH ${c.n} · ${c.name} retirée à votre demande.`,'channels');}
 if(selectedChannelCount(original,target,selected.map(c=>c.id))>p.channels)issue('error',`${selectedChannelCount(original,target,selected.map(c=>c.id))} voies de traitement sélectionnées / ${p.channels} disponibles. Décochez des voies pour continuer.`,'capacity');
 // Keep common transports only. Other correspondences must be selected explicitly.
 const banks={...suggestedBankMap(original,target),...(options.bankMap||{})};
 function physical(record,output=false){const from=record.bank,port=output?record.port:record.input,bank=banks[from],width=record.mode==='M'?1:2;
  if(!bank||!bankOptions(target,output).some(([id])=>id===bank)){issue('error',`${record.name} : choisissez une interface cible pour ${from} (${output?'sortie':'entrée'}).`,'patch');return {bank:from,[output?'port':'input']:port};}
  if(port+width-1>ioCapacity(bank,target,output)||port<1)issue('error',`${record.name} : ${bank} ${port}${width===2?'–'+(port+1):''} dépasse les ${ioCapacity(bank,target,output)} ports ${output?'de sortie':'d’entrée'} disponibles. Réaffectez ce port dans l’aperçu.`,'patch');
  if(!output&&!isYamaha(target)&&width===2&&port%2===0)issue('error',`${record.name} : paire physique ${port}–${port+1} non alignée sur une entrée impaire.`,'patch');
  if(from!==bank){report.routing.push({name:record.name,from:`${from} ${port}`,to:`${bank} ${port}`});issue('warning',`${record.name} : ${from} ${port} → ${bank} ${port}, correspondance de prises à recâbler / vérifier ; les transports ne sont pas convertis.`,'patch');}
  return {bank,[output?'port':'input']:port};
 }
 // Pack logical channels; stereo groups always keep their complete processing width.
 const mappings={CH:{},BUS:{},MAIN:{},MTX:{},FXB:{}},records=new Map();
 let cursor=1;const occupiedChannels=new Set();for(const c of selected){const width=pairedStereo(target)&&c.mode!=='M'?2:1;cursor=1;while(occupiedChannels.has(cursor)||width===2&&(cursor%2===0||occupiedChannels.has(cursor+1)))cursor++;const next=clone(c);Object.assign(next,{id:uid(),n:cursor,referenceN:fxFamily(original)==='wing'&&fxFamily(target)==='wing'?(c.referenceN||c.n):null,reviewed:false});if(next.mode==='M/S'&&pairedStereo(target)){issue('error',`${c.name} : décodage M/S externe nécessaire ; conversion automatique en stéréo indisponible.`,'channels');}
  if(options.channelPorts?.[c.id])Object.assign(next,options.channelPorts[c.id]);Object.assign(next,physical(next));
  const range={min:p.gainMin,max:p.gainMax};if(next.gain<range.min||next.gain>range.max){const gain=Math.max(range.min,Math.min(range.max,next.gain));issue('warning',`${c.name} : gain ${next.gain} → ${gain} dB (limite cible).`,'levels');next.gain=gain;}
  if(next.hpf>p.hpfMax){issue('warning',`${c.name} : coupe-bas ${next.hpf} → ${p.hpfMax} Hz.`,'levels');next.hpf=p.hpfMax;}
  if(isYamaha(target)&&next.bank!=='LCL'||!isYamaha(target)&&!['LCL','A','B','C'].includes(next.bank)){if(next.phantom||next.gain){issue('warning',`${c.name} : gain ${next.gain} dB et 48 V ${next.phantom?'ON':'OFF'} à reprendre sur le préampli externe de ${next.bank}.`,'patch');next.upstreamPreamp={gain:next.gain,phantom:next.phantom};}next.phantom=false;next.gain=0;}
  delete next.stagebox;delete next.stageboxPort;delete next.preparedGain;delete next.preparedPhantom;
  mappings.CH[c.n]=cursor;if(pairedStereo(original)&&c.mode==='ST')mappings.CH[c.n+1]=cursor+(width===2?1:0);
  records.set(`CH.${c.n}`,next);target.channels.push(next);report.channels.push({source:c.n,target:cursor,name:c.name,width});for(let side=0;side<width;side++)occupiedChannels.add(cursor+side);
 }
 target.channels.sort((a,b)=>a.n-b.n);
 const dm3SendBuses=new Set(isDM3(target)?original.fx.filter(f=>f.usage==='send').flatMap(f=>[f.sendLeft,f.sendRight]).filter(Boolean):[]);
 const sourceMixes=[...original.outputs,...(original.mixes||[])].filter(m=>!(isDM3(target)&&m.source==='BUS'&&dm3SendBuses.has(m.bus)&&!m.bank&&!Object.values(m.mainSends||{}).some(v=>v.on)&&!Object.values(m.matrixSends||{}).some(v=>v.on))),used=new Set();
 for(const kind of ['BUS','MTX','MAIN','FXB']){const outputKind=kind==='FXB'&&!isDM3(target)?'BUS':kind;let n=outputKind!==kind?Math.max(0,...target.outputs.concat(target.mixes).filter(m=>m.source==='BUS').map(m=>m.bus+logicalWidth(target,m)-1))+1:1;for(const m of sourceMixes.filter(m=>m.source===kind).sort((a,b)=>a.bus-b.bus)){const key=`${kind}.${m.bus}`;if(used.has(key))continue;used.add(key);const next=clone(m);let width=pairedStereo(target)&&m.mode==='ST'&&kind!=='MAIN'?2:1;
  if(kind==='MAIN'){n=m.bus;const mode=n===1||isYamaha(target)&&!!consoleModel(target).dm?'ST':isM32(target)||isYamaha(target)?'M':m.mode;if(m.mode!==mode)issue('warning',`${m.name} : format Main ${m.mode} → ${mode}, vérifier le contenu et la sommation dans l’éditeur cible.`,'routing');next.mode=mode;}
  else if((width===2||kind==='FXB'&&isM32(target))&&n%2===0)n++;
  if(n+width-1>(p.strips[outputKind]||0)){issue('error',`${m.name} : ${kind} ${n}${width===2?'–'+(n+1):''} ne tient pas dans la console cible.`,'capacity');continue;}
  Object.assign(next,{id:uid(),source:outputKind,bus:n,referenceN:fxFamily(original)==='wing'&&fxFamily(target)==='wing'?(m.referenceN||m.bus):null});if(m.bank){if(options.outputPorts?.[m.id])Object.assign(next,options.outputPorts[m.id]);Object.assign(next,physical(next,true));target.outputs.push(next);}else target.mixes.push(next);
  mappings[kind][m.bus]=n;if(pairedStereo(original)&&m.mode==='ST'&&kind!=='MAIN')mappings[kind][m.bus+1]=n;records.set(key,next);n+=width;
 }}
 // Explicitly map all used but otherwise unconfigured main paths.
 for(let n=1;n<=Math.min(consoleProfile(original).mains,p.mains);n++)mappings.MAIN[n]??=n;
 function translateSends(old,next,sourceKey){for(const[field,kind]of sendFields){next[field]={};for(const[n,value]of Object.entries(old[field]||{})){if(!value.on)continue;const mapped=mappings[kind][n];if(!mapped){issue('warning',`${old.name||sourceKey} → ${kind} ${n} : destination non disponible, envoi retiré.`,'routing');continue;}const destKind=kind==='FXB'&&!isDM3(target)?'BUS':kind,dest=`${destKind}.${mapped}`,destField=kind==='FXB'&&!isDM3(target)?'sends':field;
   if(!canRoute(target,sourceKey,dest)){issue('warning',`${sourceKey} → ${dest} : liaison indisponible sur la cible, envoi retiré.`,'routing');continue;}const send=clone(value);if(kind==='MAIN'&&(isYamaha(target)||isM32(target))){if(send.tap!=='POST'||send.level!==0)issue('warning',`${sourceKey} → ${dest} : assignation cible à 0 dB post-fader ; niveau ${send.level} dB / ${send.tap} à reprendre.`,'routing');send.tap='POST';if(isYamaha(target)||mapped===1)send.level=0;}
   if(send.tap==='GRP'&&(kind!=='BUS'||!sourceKey.startsWith('CH.'))){issue('warning',`${sourceKey} → ${dest} : mode groupe remplacé par un envoi post-fader à 0 dB.`,'routing');send.tap='POST';send.level=0;}
   next[destField][mapped]=send;
  }}next.main=!!(old.main&&mappings.MAIN[1]);if(old.main&&!next.mainSends[1])next.mainSends[1]={on:next.main,level:0,tap:'POST'};}
 for(const c of selected)translateSends(c,records.get(`CH.${c.n}`),`CH.${mappings.CH[c.n]}`);
 for(const m of sourceMixes){const next=records.get(`${m.source}.${m.bus}`);if(next)translateSends(m,next,`${m.source}.${next.bus}`);}
 target.groups={dca:[],mute:[]};target.groupAssignments={};
 for(const type of ['dca','mute'])for(const g of original.groups?.[type]||[]){const members=Object.entries(original.groupAssignments||{}).filter(([,a])=>(a[type==='dca'?'dcas':'mutes']||[]).includes(g.n));if(g.n>p[type]){if(members.length||g.name)issue('warning',`${type==='dca'?'DCA':'Mute group'} ${g.n} · ${g.name||''} indisponible sur la cible, affectations retirées.`,'groups');continue;}target.groups[type].push({...g,col:isM32(target)?Math.min(15,g.col||1):g.col||1});}
 for(const[key,a]of Object.entries(original.groupAssignments||{})){const[kind,raw]=key.split('.'),n=mappings[kind]?.[raw];if(!n)continue;if(isDM3(target)&&kind!=='CH'&&a.mutes?.length)issue('warning',`${key} : mute group de sortie indisponible sur DM3.`,'groups');target.groupAssignments[`${kind==='FXB'&&!isDM3(target)?'BUS':kind}.${n}`]={dcas:(a.dcas||[]).filter(v=>v<=p.dca),mutes:isDM3(target)&&kind!=='CH'?[]:(a.mutes||[]).filter(v=>v<=p.mute)};}
 for(const c of target.channels)c.dca=target.groupAssignments[`CH.${c.n}`]?.dcas[0]||0;
 // Slot restrictions and DSP budgets are evaluated after a functional match.
 const allFx=[...(original.fx||[]),...(fxFamily(original)==='wing'&&fxFamily(target)!=='wing'?wingChannelEqProcessors(original):[])].sort((a,b)=>(a.usage==='send'?0:1)-(b.usage==='send'?0:1)||(a.position==='preins'?0:1)-(b.position==='preins'?0:1)||a.slot-b.slot),insertUse=new Map();
 for(const old of allFx){const chosen=options.effectTargets?.[old.id],chosenStrip=chosen&&(chosen.target==='CH'?target.channels.find(c=>c.n===chosen.targetN):getMixes(target).find(m=>m.source===chosen.target&&m.bus===chosen.targetN)),match=matchEffect(original,target,old,{override:options.effects?.[old.id],stereo:chosenStrip?.mode==='ST'?true:undefined,targetKind:chosen?.target}),row={id:old.id,slot:old.slot,sourceLabel:old.sourceLabel,...match,allocation:null};report.effects.push(row);if(!match.to){issue('warning',`${old.model} : ${match.reason}`,'fx');continue;}
  const f={id:uid(),model:match.to.id,rack:match.to.rack,mix:old.mix??100,bypass:!!old.bypass,position:old.position||'postins',insertSlot:old.insertSlot||1},send=old.usage==='send';
  const explicitTarget=options.effectTargets?.[old.id];
  if(old.usage==='unassigned'&&!explicitTarget){row.status='unassigned';row.reason='Affectation d’origine introuvable. Choisissez la destination du remplacement dans la console cible.';issue('error',`${old.model} : choisissez la destination du remplacement dans l’aperçu des effets.`,'fx');continue;}
  if(old.bypass&&isM32(target)&&send){issue('error',`${old.model} : le bypass global d’un FX en envoi / retour n’est pas traduit vers M32. Retirez cet effet ou réactivez-le dans la préparation source.`,'fx');continue;}
  if(isYamaha(target)&&f.rack==='premium'&&f.mix!==100){issue('warning',`${old.model} : mix ${f.mix}% à reprendre dans le paramètre Wet/Dry Premium.`,'fx');f.mix=100;}
  if(explicitTarget){const record=explicitTarget.target==='CH'?target.channels.find(c=>c.n===explicitTarget.targetN):getMixes(target).find(m=>m.source===explicitTarget.target&&m.bus===explicitTarget.targetN);
   if(!record||!['CH','BUS','MAIN','MTX'].includes(explicitTarget.target)||!['preins','postins'].includes(explicitTarget.position)){issue('error',`${old.model} : destination du remplacement invalide ou retirée.`,'fx');continue;}
   if(explicitTarget.target!=='CH'&&!target.outputs.concat(target.mixes).some(m=>m.source===explicitTarget.target&&m.bus===explicitTarget.targetN))target.mixes.push({...clone(record),id:uid()});
   Object.assign(f,{usage:'insert',target:explicitTarget.target,targetN:explicitTarget.targetN,position:explicitTarget.position});
   issue('warning',`${old.model} → ${f.model} : affectation choisie sur ${f.target} ${f.targetN}, ${f.position==='preins'?'pré-insert':'post-insert'}.`,'fx');
  }else if(send&&isYamaha(target)&&isDM3(target)){f.usage='send';}
  else if(send&&!isYamaha(target)&&!isM32(target)){// WING uses an inserted engine on a bus, then bus-to-main routing.
   const left=isDM3(original)?mappings.FXB[old.slot]:mappings.BUS[old.sendLeft],right=isDM3(original)?left:mappings.BUS[old.sendRight];if(!left||right&&left!==right){issue('error',`${old.model} : deux bus mono indépendants alimentent le FX ; fusionnez-les en bus stéréo avant la conversion WING.`,'fx');continue;}
   const bus=target.outputs.concat(target.mixes).find(m=>m.source==='BUS'&&m.bus===left);if(!bus){issue('error',`${old.model} : bus d’envoi introuvable.`,'fx');continue;}f.usage='insert';f.target='BUS';f.targetN=left;f.mix=100;
   // Apply the return attenuation on the bus-to-main path, preserving send bus fader.
   if(old.main){bus.mainSends[1]={on:!old.returnMute,level:old.returnLevel??0,tap:'POST'};}
   if(Object.values(old.sends||{}).some(x=>x.on)||Object.values(old.matrixSends||{}).some(x=>x.on))issue('warning',`${old.model} : envois secondaires du retour FX à reconstruire ; le retour dédié devient le bus traité WING.`,'fx');
  }else if(send){f.usage='send';f.sendLeft=(isDM3(original)?mappings.FXB[old.slot]:mappings.BUS[old.sendLeft])||0;f.sendRight=isDM3(original)?f.sendLeft:mappings.BUS[old.sendRight]||0;}
  else{const n=mappings[old.target]?.[old.targetN];if(!n){row.status='omitted';row.reason='Insert retiré avec sa voie / destination.';issue('warning',`${old.model} : destination retirée, insert non créé.`,'fx');continue;}Object.assign(f,{usage:'insert',target:old.target,targetN:n});if(old.rightTarget){const[k,n]=old.rightTarget.split('.'),right=mappings[k]?.[n];if(right)f.rightTarget=`${k}.${right}`;else issue('warning',`${old.model} : seconde destination retirée.`,'fx');}}
  if(match.to.placement==='channel')f.usage='channel-eq';
  if(match.from.kind==='geq'&&match.to.kind==='geq'&&Array.isArray(old.eqBands)&&old.eqBands.length===31)f.eqBands=clone(old.eqBands);
  if(isDM3(target)&&f.usage==='insert'){row.status='missing';row.reason='DM3 : ce parcours ne permet pas les inserts ; prévoir un processeur externe sur le chemin audio.';issue('warning',`${old.model} : ${row.reason}`,'fx');continue;}
  const max=isM32(target)?(f.usage==='send'?4:8):16;
  if(isYamaha(target)){f.slot=freeYamahaSlot(target,f.model);if(f.usage==='send'&&f.rack==='premium'&&!consoleModel(target).dm&&f.slot>2)f.slot=0;}
  else f.slot=Array.from({length:max},(_,i)=>i+1).find(n=>!target.fx.some(x=>x.slot===n)&&(isM32(target)?m32EffectAllowed(f.model,n):effectAllowed(f.model,n)))||0;
  if(!f.slot){row.status='unallocated';issue('error',`${old.model} → ${f.model} : pas de slot / ressources DSP disponibles. Retirez cet effet dans l’aperçu ou changez la cible.`,'capacity');continue;}
  if(f.usage==='send'){
   Object.assign(f,{returnLevel:old.returnLevel??0,returnMute:old.returnMute??true,main:old.main!==false,sends:{},mainSends:{},matrixSends:{},fxSends:{}});
   if(isYamaha(target)){f.returnN=isDM3(target)?f.slot:freeYamahaReturn(target);const info=yamahaEffectInfo(target,f.model);if(info.inputs===1)f.sendRight=0;else if(info.requiresRight&&!f.sendRight)f.sendRight=f.sendLeft;}
   else{f.returnN=f.slot;if(!f.sendRight)f.sendRight=f.sendLeft;}
   if(!f.returnN){issue('error',`${old.model} : aucune paire de voies libre pour le retour FX.`,'capacity');continue;}
   target.fx.push(f);translateSends({...old,name:`Retour ${old.model}`},f,`FXR.${isYamaha(target)?f.slot+(f.rack==='premium'?100:0):(f.slot-1)*2+1}`);
   // DM3 has two dedicated FX buses. Copy the old send bus incoming routes there.
   if(isDM3(target)){
    f.sendLeft=0;f.sendRight=0;
    const oldBus=original.outputs.concat(original.mixes||[]).find(m=>m.source==='BUS'&&m.bus===old.sendLeft),newBus=makeMix('FXB',f.slot,{mode:'M',name:`FX ${f.slot}`,fader:oldBus?.fader??0,mute:oldBus?.mute??false,type:'FX'});target.mixes=target.mixes.filter(m=>!(m.source==='FXB'&&m.bus===f.slot));target.mixes.push(newBus);
    for(const c of selected){const next=records.get(`CH.${c.n}`),value=isDM3(original)?c.fxSends?.[old.slot]:c.sends?.[old.sendLeft];if(value?.on)(next.fxSends??={})[f.slot]=clone(value);}
    if(old.sendRight&&old.sendRight!==old.sendLeft)issue('warning',`${old.model} : entrée droite indépendante non reproduite par le FX BUS mono DM3.`,'fx');
   }
  }else if(f.usage==='channel-eq'){
   if(target.fx.some(x=>x.rack==='channel'&&x.model===f.model&&x.target===f.target&&x.targetN===f.targetN)){issue('error',`${old.model} : l’EQ de tranche ${f.target} ${f.targetN} est déjà utilisé. Choisissez un EQ en rack.`,'fx');continue;}
   target.fx.push(f);
   issue('warning',`${old.model} : fonction reprise par l’EQ de tranche ${f.target} ${f.targetN}, position native fixe et coloration à comparer.`,'fx');
  }else{
   const key=`${f.target}.${f.targetN}`,maxInserts=isM32(target)?1:isYamaha(target)?yamahaFxCapacity(target).inserts:2,used=insertUse.get(key)||[];if(used.length>=maxInserts){issue('error',`${old.model} : aucun insert libre sur ${key}. Retirez cet effet ou changez de destination.`,'fx');continue;}if(isYamaha(target)){f.insertSlot=used.length+1;if(used.length&&used[0]!==f.position){f.position=used[0];issue('warning',`${old.model} : point commun des inserts Yamaha repris en ${f.position==='preins'?'pré-insert':'post-insert'} ; ordre des traitements conservé, position dans la tranche à contrôler.`,'fx');}}else if(!isM32(target)&&used.includes(f.position)){f.position=f.position==='preins'?'postins':'preins';issue('warning',`${old.model} : insert déplacé en ${f.position} pour éviter un conflit.`,'fx');}used.push(f.position);insertUse.set(key,used);
   if(f.rightTarget&&!match.to.dual&&isYamaha(target)){issue('error',`${old.model} : le remplacement ${f.model} ne possède pas deux traitements mono indépendants.`,'fx');continue;}
   target.fx.push(f);
  }
  if(match.status==='same'){
   if(old.nativeParameters&&Array.isArray(old.nativeParameters.values)&&old.nativeParameters.values.length&&(Array.isArray(old.nativeParameters.values[0])?old.nativeParameters.values.every(v=>v.length&&v.every(Number.isFinite)):old.nativeParameters.values.every(Number.isFinite)))f.nativeParameters=clone(old.nativeParameters);
   else if(!isYamaha(original)&&!isM32(original)&&original.template?.ae_data?.fx?.[old.slot])f.nativeParameters={family:'wing',model:old.model,values:clone(original.template.ae_data.fx[old.slot])};
  }
  row.parameters=f.eqBands?'Gains des 31 bandes conservés en dB ; contrôler la réponse des filtres et les limites de la cible.':f.nativeParameters?'Banque native conservée dans la même famille et pour le même algorithme.':'Banque initiale de la cible : réglages source non traduits, à reconstruire dans l’éditeur cible.';
  if(!f.nativeParameters&&!f.eqBands)issue('warning',`${old.model} → ${f.model} : banque initiale de la cible ; temps, seuils, ratios, modulation et filtres détaillés à reconstruire.`,'parameters');
  if(f.rightTarget&&!isYamaha(target)&&!isM32(target)){
   const[kind,n]=f.rightTarget.split('.'),slot=Array.from({length:16},(_,i)=>i+1).find(n=>!target.fx.some(x=>x.slot===n)&&effectAllowed(f.model,n)),key=f.rightTarget,occupied=insertUse.get(key)||[];
   if(!slot||occupied.includes(f.position)){issue('error',`${old.model} : impossible de dédoubler le côté droit sur ${key} dans un slot / insert WING libre.`,'fx');continue;}
   const second={...clone(f),id:uid(),slot,target:kind,targetN:Number(n)};delete second.rightTarget;delete second.nativeParameters;delete f.rightTarget;target.fx.push(second);occupied.push(second.position);insertUse.set(key,occupied);
   issue('warning',`${old.model} : les deux traitements mono deviennent deux instances ${f.model}, FX ${f.slot} et ${slot}, avec réglages à reconstruire.`,'fx');row.reason+=` Côté droit dédoublé dans FX ${slot} sur ${key}.`;
  }
  row.allocation={slot:f.slot,rack:f.rack,usage:f.usage,target:f.target,targetN:f.targetN};
 }
 // Imported DM3 dedicated buses become normal send buses on other engines.
 if(isDM3(original)&&!isDM3(target))issue('warning','Les FX BUS dédiés DM3 deviennent des bus ordinaires sur la cible.','routing');
 // Avoid transporting source-specific raw state into a different family.
 if(fxFamily(original)===fxFamily(target)&&fxFamily(target)==='wing'&&original.template){target.template=clone(original.template);target.managedOriginal=clone(original.managedOriginal||{channels:original.channels.map(c=>c.n),outputs:original.outputs.map(o=>({bank:o.bank,port:o.port,mode:o.mode})),mixes:original.mixes,fx:original.fx});}
 if(fxFamily(original)!==fxFamily(target))issue('warning','Les réglages avancés de tranche (courbes EQ, gate, compression, délais, polarités, sidechains) ne sont pas traduits entre familles ; les modèles d’EQ WING identifiés sont proposés séparément ci-dessus. Le fichier source est conservé pour les reconstruire.','processing');
 else if(fxFamily(target)==='cl')issue('warning','Les EQ et dynamiques de tranche CL/QL ne sont pas réappliqués ; reprendre ces traitements depuis le fichier source.','processing');
 else issue('info','Les banques de traitement de tranche restent dans leur format lorsqu’elles ont été lues : WING, M32 ou DM de même famille.','processing');
 // Every issue remains reviewable; no successful-looking export with dropped records.
 if(fxFamily(original)!==fxFamily(target))for(const r of [...target.channels,...target.outputs,...target.mixes]){delete r.nativeProcessingM32;delete r.nativeProcessingDM;}
 const validation=validate(target).filter(i=>i.level==='error');for(const item of validation)if(!report.issues.some(i=>i.text===item.text))issue('error',item.text,item.tab||'validation');
 target.conversionReport=report;target.conversionSource={name:source.name,model:source.model,...(options.sourceArchive||{format:'project',project:original})};target.notes+=(target.notes?'\n\n':'')+'Show Evangelist · '+CONSOLES[source.model]+' → '+CONSOLES[target.model]+'. Voir le rapport de conversion dans le projet.';
 return {show:target,report,errors:report.issues.filter(i=>i.level==='error'),warnings:report.issues.filter(i=>i.level==='warning'),count:selectedChannelCount(original,target,selected.map(c=>c.id))};
}
export function conversionReportText(report){return [`# Show Evangelist`,`${CONSOLES[report.source.model]} → ${CONSOLES[report.target.model]}`,`Référence ${report.reference}`,``,...report.channels.map(c=>`CH ${c.source} → CH ${c.target} · ${c.name} (${c.width} voie${c.width>1?'s':''})`),``,...report.effects.flatMap(f=>[`${f.from.name} → ${f.to?.name||'Aucun remplacement'} · ${f.status}`,f.from.description,f.reason,f.parameters,`Besoin externe : ${f.from.replacement}`,`${f.from.source?.title||''} : ${f.from.source?.url||''}`,``]),...report.issues.map(i=>`[${i.level}] ${i.text}`)].join('\n');}

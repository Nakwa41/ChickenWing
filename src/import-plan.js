import {newShow,clone,validate,BANKS} from './core.js';
import {consoleProfile,ioCapacity,nextFreeNumber,logicalWidth,isYamaha,defaultBank} from './consoles.js';
import {refreshPhantom} from './microphones.js';

function freePort(records,bank,model,mode,output=false){
 const used=new Set(records.filter(c=>c.bank===bank).flatMap(c=>{const p=output?c.port:c.input;return c.mode==='M'?[p]:[p,p+1];}));
 const width=mode==='M'?1:2;
 return Array.from({length:ioCapacity(bank,model,output)},(_,i)=>i+1).find(n=>n+width-1<=ioCapacity(bank,model,output)&&(output||isYamaha(model)||width===1||n%2===1)&&Array.from({length:width},(_,i)=>n+i).every(p=>!used.has(p)));
}
export function planRiderImport(current,result,options={}){
 const creating=options.target!=='append',s=creating?newShow(options.name?.trim()||'Show importé'):clone(current);
 if(creating)Object.assign(s,{model:options.model||current.model,artist:options.artist||'',date:options.date||'',venue:options.venue||'',...(isYamaha(options.model||current.model)?{stageboxes:clone(options.stageboxes||((options.model||current.model)===current.model?current.stageboxes:[])||[]),sampleRate:options.sampleRate||current.sampleRate||48,danteMode:options.danteMode||current.danteMode||'manual'}:{})});
 const errors=[],changes=[],channels=result.channels.filter(c=>c.include!==false),outputs=result.outputs.filter(o=>o.include!==false);
 if(!channels.length&&!outputs.length)errors.push('Sélectionnez au moins une voie ou une sortie.');
 if(creating&&!options.name?.trim())errors.push('Donnez un nom au nouveau show.');
 for(const original of channels){
  const c=clone(original),meta=c.importMeta||{},before={n:c.n,bank:c.bank,input:c.input};delete c.include;
  if(!meta.bankExplicit)c.bank=options.bank||defaultBank(s);
  if(meta.logicalExplicit===false)c.n=nextFreeNumber(s,'CH',c.mode);
  if(options.free){c.n=nextFreeNumber(s,'CH',c.mode);c.input=freePort(s.channels,c.bank,s,c.mode);}
  else if(!meta.portExplicit)c.input=freePort(s.channels,c.bank,s,c.mode);
  if(!c.n||!c.input){errors.push(`${c.name} : aucune place disponible sur ${BANKS[c.bank]||c.bank}.`);continue;}
  if(c.phantomMode==='auto')refreshPhantom({channels:[c]},c);
  if(before.n!==c.n||before.bank!==c.bank||before.input!==c.input)changes.push(`${c.name} → CH ${c.n}, ${BANKS[c.bank]||c.bank} ${c.input}${c.mode!=='M'?`–${c.input+1}`:''}`);
  s.channels.push(c);
 }
 for(const original of outputs){
  const o=clone(original),meta=o.importMeta||{},before={bus:o.bus,bank:o.bank,port:o.port};delete o.include;
  if(!meta.bankExplicit)o.bank=options.outBank||defaultBank(s,true);
  if(meta.logicalExplicit===false)o.bus=nextFreeNumber(s,o.source,o.mode);
  if(options.free){o.bus=nextFreeNumber(s,o.source,o.mode);o.port=freePort(s.outputs,o.bank,s,o.mode,true);}
  else if(!meta.portExplicit)o.port=freePort(s.outputs,o.bank,s,o.mode,true);
  if(!o.bus||!o.port){errors.push(`${o.name} : aucun bus ou port de sortie disponible.`);continue;}
  if(before.bus!==o.bus||before.bank!==o.bank||before.port!==o.port)changes.push(`${o.name} → ${o.source} ${o.bus}, ${BANKS[o.bank]||o.bank} ${o.port}`);
  s.outputs.push(o);
 }
 s.channels.sort((a,b)=>a.n-b.n);
 errors.push(...validate(s).filter(i=>i.level==='error').map(i=>i.text));
 const selected=result.selectedSections||[];
 (s.files??=[]).push({name:result.filename||'Texte collé',date:Date.now(),raw:result.raw,unparsed:clone(result.unparsed||[]),warnings:clone(result.warnings||[]),sections:selected,audioContext:clone(result.context||{}),importedChannels:channels.length,importedOutputs:outputs.length});
 if(creating&&result.context?.consoles?.length)s.notes='Console demandée dans la fiche : '+result.context.consoles.map(c=>c.label).join(' / ')+'. Patch adapté au modèle choisi dans ChickenWing. Les BUS et envois des ports OUT sont à vérifier.';
 s.updated=Date.now();
 return {show:s,errors:[...new Set(errors)],changes,channelCount:channels.reduce((n,c)=>n+logicalWidth(s,c),0),outputCount:outputs.length,profile:consoleProfile(s)};
}

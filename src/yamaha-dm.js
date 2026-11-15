import {writeDMEq} from './yamaha-eq.js';
import {applyDMProcessing} from './native-processing.js';
import {yamahaEffectInfo,yamahaRack,yamahaInsertTargets,yamahaParameterValues} from './yamaha-effects.js';
import {getMixes} from './routing.js';
import {consoleProfile,consoleModel,isDM3,logicalWidth} from './consoles.js';
import {parseMBDF,readEntry,writeMBDF,sections,newFileRecord} from './yamaha-binary.js';
import {getAssignment} from './groups.js';
import {stageboxModel,unitLabel} from './yamaha-stageboxes.js';
const encoder=new TextEncoder();
const text=(s,n=8)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ').slice(0,n);
const level=n=>n<=-138?-32768:Math.round(n*100);
const colors={Batterie:'Orange',Basse:'Purple',Guitares:'Blue',Claviers:'Green',Voix:'Red',Autres:'White'};
export const dmInputCode=(s,bank,n)=>({LCL:0x01400000+(isDM3(s)?0:0x1000),DANTE:0x01a00000,USB:0x01800000,AES:0x01601000}[bank]??NaN)+n-1;
export function dmOutputCode(s,o,side=0){const dm3=isDM3(s);return o.source==='MAIN'?(dm3?0x04600000:0x04200000)+(o.bus-1)*16+side:({BUS:dm3?0x04200000:0x03e00000,MTX:dm3?0x04400000:0x04000000})[o.source]+o.bus-1+side;}
function applyCurrent(s,current){
 const all=sections(current),mix=all.Mixing,proc=all.Processing,dm3=isDM3(s),p=consoleProfile(s),model=consoleModel(s);
 const put=(path,value)=>{if(mix.has(path))mix.set(path,value);};
 const send=(base,to,n,value)=>{const path=`${base}/${to}[${n}]`;put(path+'/On',value?.on?1:0);put(path+'/Level',level(value?.tap==='GRP'?0:value?.level??-144));put(path+'/Pre',value?.tap==='PRE'?1:0);};
 const resetStrip=base=>{put(base+'/Fader/On',0);put(base+'/Fader/Level',-32768);put(base+'/Label/Name','');for(const [to,max]of [['ToMix',p.buses],['ToMatrix',p.matrices],['ToFX',dm3?2:0]])for(let n=0;n<max;n++)send(base,to,n);for(const a of ['Assign','ToStereoA','ToStereoB','ToLCR'])put(base+'/ToStereo/'+a,0);};
 // The base is a fresh editor save. Clear all audible paths before applying the show.
 for(const group of ['InputChannel','StInChannel','FxRtnChannel','Mix','Matrix','Stereo','FxBus'])for(let n=0;n<mix.count(group);n++)resetStrip(`${group}[${n}]`);
 if(!dm3)for(const group of ['InputChannel','Mix','Matrix','Stereo'])for(let n=0;n<mix.count(group);n++){const base=`${group}[${n}]/Insert`;put(base+'/On',0);for(let module=0;module<4;module++)put(`${base}/Module[${module}]/Patch/Source`,0);}
 for(let n=0;n<mix.count('InputChannel');n++){const base=`InputChannel[${n}]`;put(base+'/ChannelLink/GroupId',0);if(dm3)put(base+'/Patch/Source',0);else{put(base+'/InPatch/Select',0);put(base+'/InPatch/Bank[0]/Source',0);put(base+'/InPatch/Bank[1]/Source',0);}}
 const outputBank=bank=>({LCL:'Omni',DANTE:'Dante',USB:dm3?'USBToHost':'USB',AES:'AES',PY:'PY'})[bank];
 for(const bank of ['Omni','Dante','USB','USBToHost','AES','PY'])for(let n=0;n<proc.count(bank+'/OutputPort');n++)proc.set(`${bank}/OutputPort[${n}]/Patch/Source`,0);
 const haBank=dm3?'BuiltIn':'Omni';for(let n=0;n<proc.count(haBank+'/InputPort');n++){proc.set(`${haBank}/InputPort[${n}]/HeadAmp/48V`,0);proc.set(`${haBank}/InputPort[${n}]/HeadAmp/Gain`,0);}
 const assignments=(base,key)=>{const a=getAssignment(s,key);for(let n=0;n<p.dca;n++)if(mix.has(base+'/DCA/Assign'))mix.set(base+'/DCA/Assign',a.dcas.includes(n+1)?1:0,n);for(let n=0;n<p.mute;n++){if(dm3)put(`${base}/MuteGroup[${n}]/Assign`,a.mutes.includes(n+1)?1:0);else if(mix.has(base+'/MuteGroup/Assign'))mix.set(base+'/MuteGroup/Assign',a.mutes.includes(n+1)?1:0,n);}};
 for(const [group,kind]of [['InputChannel','CH'],['Mix','BUS'],['Matrix','MTX'],['Stereo','MAIN']])for(let n=0;n<mix.count(group);n++){assignments(`${group}[${n}]`,`${kind}.${kind==='MAIN'?Math.floor(n/2)+1:n+1}`);if(['Mix','Matrix'].includes(group))put(`${group}[${n}]/Signal/Relation`,0);}
 const route=(base,c,side=0)=>{
  for(const [kind,field,to,max]of [['BUS','sends','ToMix',p.buses],['MTX','matrixSends','ToMatrix',p.matrices],['FXB','fxSends','ToFX',dm3?2:0]]){
   for(let n=0;n<max;n++)send(base,to,n,c[field]?.[n+1]);
   for(const dest of [...s.outputs,...(s.mixes||[])].filter(m=>m.source===kind&&m.mode==='ST')){const value=c[field]?.[dest.bus];send(base,to,dest.bus-1,value);send(base,to,dest.bus,value);if(value?.on){put(`${base}/${to}[${dest.bus-1}]/Pan`,c.mode==='ST'?(side?63:-63):0);}}
  }
  const on=c.n?c.main:c.mainSends?.[1]?.on;
  if(dm3)put(base+'/ToStereo/Assign',on?1:0);else{put(base+'/ToStereo/ToStereoA',on?1:0);put(base+'/ToStereo/ToStereoB',c.mainSends?.[2]?.on?1:0);}
  put(base+'/ToStereo/Pan',c.mode==='ST'?(side?63:-63):Math.round((c.pan||0)*.63));
 };
 let link=1;
 for(const c of s.channels){
  const width=logicalWidth(s,c);
  for(let side=0;side<width;side++){
   const base=`InputChannel[${c.n-1+side}]`;applyDMProcessing(mix,base,c,dm3?'dm3':'dm7');
   put(base+'/Label/Name',text(c.name));put(base+'/Label/Color',colors[c.category]||'White');put(base+'/Fader/On',c.mute?0:1);put(base+'/Fader/Level',level(c.fader));
   const code=dmInputCode(s,c.bank,c.input+side);if(!Number.isFinite(code))throw new Error(`Interface Yamaha non gérée : ${c.bank}`);
   if(dm3)put(base+'/Patch/Source',code);else{put(base+'/InPatch/Select',0);put(base+'/InPatch/Bank[0]/Source',code);}
   const hpf=dm3?base+'/PEQ/Bank/HPF':base+'/HPF[0]';put(hpf+'/On',c.hpf>0?1:0);put(hpf+'/Frequency',Math.round((c.hpf||80)*10));
   if(c.bank==='LCL'){const amp=`${haBank}/InputPort[${c.input-1+side}]/HeadAmp`;proc.set(amp+'/Gain',Math.round(c.gain*100));proc.set(amp+'/48V',c.phantom?1:0);}
   if(c.stagebox){const boxIndex=(s.stageboxes||[]).findIndex(b=>b.id===c.stagebox),amp=dm3?`Dante/InputPort[${c.input-1+side}]/HeadAmp`:`DanteRemoteControl/IOUnit[${boxIndex}]/InputPort[${c.stageboxPort-1+side}]/HeadAmp`,target=dm3?proc:mix;if(target.has(amp+'/Gain')){target.set(amp+'/Gain',Math.round(c.preparedGain*100));target.set(amp+'/48V',c.preparedPhantom?1:0);}}
   if(width===2)put(base+'/ChannelLink/GroupId',link);
   assignments(base,`CH.${c.n}`);route(base,c,side);
  }
  if(width===2)link++;
 }
 for(let n=1;n<=p.buses;n++){const first=n%2?n:n-1,fixed=s.channels.some(c=>[first,first+1].some(b=>c.sends?.[b]?.on&&c.sends[b].tap==='GRP'));put(`Mix[${n-1}]/BusType`,fixed?'FIXED':'VARI');}
 for(const c of getMixes(s,{allMains:false})){
  const group=({BUS:'Mix',MTX:'Matrix',MAIN:'Stereo',FXB:'FxBus'})[c.source],width=c.source==='MAIN'?2:logicalWidth(s,c),index=c.source==='MAIN'?(c.bus-1)*2:c.bus-1;
  for(let side=0;side<width;side++){const base=`${group}[${index+side}]`;applyDMProcessing(mix,base,c,dm3?'dm3':'dm7');put(base+'/Label/Name',text(c.name));put(base+'/Fader/On',c.mute?0:1);put(base+'/Fader/Level',level(c.fader));assignments(base,`${c.source}.${c.bus}`);route(base,c,side);if(c.source!=='MAIN'&&width===2)put(base+'/Signal/Relation',side?2:1);}
  if(c.bank){const bank=outputBank(c.bank);if(!bank)throw new Error(`Interface de sortie Yamaha non gérée : ${c.bank}`);for(let side=0;side<(c.mode==='ST'?2:1);side++)proc.set(`${bank}/OutputPort[${c.port-1+side}]/Patch/Source`,dmOutputCode(s,c,side));}
 }
 // Reset every rack port, including the second half of two-unit algorithms.
 const fx=all.FX;
 for(let n=0;n<fx.count('FX');n++){const base=`FX[${n}]`;fx.set(base+'/Bypass',1);fx.set(base+'/MixBalance',100);if(!dm3){fx.set(base+'/Param/PluginName','');fx.set(base+'/Param/LibraryName','');fx.set(base+'/Param/SlotSize',0);for(let side=0;side<2;side++)put(`EffectRack/Slot[${n}]/InputPort[${side}]/Patch/Source`,0);}}
 const premium=all.PremiumRack;
 if(!dm3)for(let bank=0;bank<6;bank++)for(let slot=0;slot<16;slot++){const b=`PremiumRack2[${bank}]/PlugIn[${slot}]`;premium.set(b+'/PluginName','');premium.set(b+'/SlotSize',0);premium.set(b+'/ItemNum',0);for(let side=0;side<2;side++){premium.set(`${b}/LR[${side}]/Bypass`,1);put(`PremiumRack[${bank}]/Slot[${slot}]/InputPort[${side}]/Patch/Source`,0);put(`PremiumRack[${bank}]/Slot[${slot}]/KeyInInput[${side}]/Patch/Source`,0);}}
 for(let i=0;i<mix.count('GEQRack2');i++){const b=`GEQRack2[${i}]`;mix.set(b+'/Type','');mix.set(b+'/SlotSize',0);mix.set(b+'/ItemNum',0);for(let side=0;side<2;side++)mix.set(`${b}/AB[${side}]/Patch/Source`,0);}
 for(const f of s.fx||[]){
  if(['eq','channel'].includes(yamahaRack(f))){writeDMEq(s,mix,f,yamahaInsertTargets(s,f));continue;}
  const info=yamahaEffectInfo(s,f.model),pr=yamahaRack(f)==='premium',bank=Math.floor((f.slot-1)/16),slot=(f.slot-1)%16,base=`FX[${f.slot-1}]`,portBase=pr?`PremiumRack[${bank}]/Slot[${slot}]`:`EffectRack/Slot[${f.slot-1}]`,sourceBase=pr?0x06600000+bank*0x8000+slot*16:0x06c00000+(f.slot-1)*16;
  if(pr){const b=`PremiumRack2[${bank}]/PlugIn[${slot}]`;premium.set(b+'/PluginName',info.id);premium.set(b+'/SlotSize',info.size);premium.set(b+'/ItemNum',info.items);for(let side=0;side<2;side++)premium.set(`${b}/LR[${side}]/Bypass`,f.bypass?1:0);for(let side=0;side<info.items;side++){premium.set(`${b}/LR[${side}]/LibraryName`,info.library.slice(0,16));premium.set(`${b}/LR[${side}]/Bypass`,f.bypass?1:0);for(let n=0;n<64;n++)premium.set(`${b}/LR[${side}]/Parameter[${n}]/Value`,yamahaParameterValues(s,f,info,side)[n]||0);}}
  else{fx.set(base+'/Bypass',f.bypass?1:0);fx.set(base+'/MixBalance',f.mix);fx.set(base+'/Param/PluginName',info.id);fx.set(base+'/Param/LibraryName',info.library.slice(0,16));if(!dm3)fx.set(base+'/Param/SlotSize',info.size);for(let n=0;n<64;n++)fx.set(base+'/Param/Bank/Value',yamahaParameterValues(s,f,info)[n]||0,n);}
  if(f.usage==='send'){
   if(dm3){const bus=getMixes(s).find(m=>m.source==='FXB'&&m.bus===f.slot),b=`FxBus[${f.slot-1}]`;put(b+'/Fader/On',bus?.mute?0:1);put(b+'/Fader/Level',level(bus?.fader??0));put(b+'/Label/Name',text(bus?.name||`FX ${f.slot}`));}
   else for(let side=0;side<2;side++){const bus=side?f.sendRight:f.sendLeft;put(`${portBase}/InputPort[${side}]/Patch/Source`,bus?dmOutputCode(s,{source:'BUS',bus}):0);}
   for(let side=0;side<(dm3?1:2);side++){const b=dm3?`FxRtnChannel[${f.slot-1}]`:`InputChannel[${f.returnN-1+side}]`;put(b+'/Label/Name',text(`${pr?'PR':'FX'}${f.slot} RTN`));put(b+'/Label/Color','Purple');put(b+'/Label/Icon','Effect');put(b+'/Fader/On',f.returnMute?0:1);put(b+'/Fader/Level',level(f.returnLevel));if(dm3)put(b+'/Patch/Source',0x06400000+f.slot-1);else{put(b+'/InPatch/Select',0);put(b+'/InPatch/Bank[0]/Source',sourceBase+(info.outputs===1?0:side));put(b+'/ChannelLink/GroupId',link);}route(b,{...f,n:1,mode:dm3?'M':'ST'},side);}
   if(!dm3)link++;
  }else for(const t of yamahaInsertTargets(s,f)){const group=({CH:'InputChannel',BUS:'Mix',MTX:'Matrix',MAIN:'Stereo'})[t.kind],b=`${group}[${t.index}]/Insert`;put(b+'/On',1);put(b+'/Point',f.position==='preins'?60:100);put(`${b}/Module[${f.insertSlot-1}]/Patch/Source`,sourceBase+(info.outputs===1?0:t.side));put(`${portBase}/InputPort[${t.side}]/Patch/Source`,({CH:0x13c00000,BUS:0x13e00000,MTX:0x14000000,MAIN:0x14200000})[t.kind]+(f.insertSlot-1)*0x1000+t.index);}
 }
 for(const g of s.groups?.dca||[]){put(`DCA[${g.n-1}]/Label/Name`,text(g.name));put(`DCA[${g.n-1}]/Fader/Level`,level(g.fader));put(`DCA[${g.n-1}]/Fader/On`,g.mute?0:1);}
 for(const g of s.groups?.mute||[])put(`Mute[${g.n-1}]/Label/Name`,text(g.name));
 const info=all.SceneInfo;if(info){info.set('Info/Title',text(s.name,63));info.set('Info/Comment',text(s.notes,127));info.set('Info/ProductName',model.dm.toUpperCase());info.set('Info/ProductSubName',s.model==='dm3s'?'DM3':s.model.toUpperCase());info.set('Info/Protect',0);if(info.has('Focus/On'))info.set('Focus/On',0);info.set('Fading/On',0);}
 return current;
}
function applySetup(s,m){
 const all=sections(m),setup=all.Setup;if(!setup)return;
 const put=(path,value)=>{if(setup.has(path))setup.set(path,value);},dm3=isDM3(s),rate=(s.sampleRate||48)*1000;
 put('WordClock/Source',(dm3?'INT':'DANTE')+rate);put('DanteNetwork/Config/NetworkFs',rate);
 put('DanteNetwork/PatchFromThisConsole',s.danteMode==='console'?1:0);
 const powered=s.channels.some(c=>c.phantom||c.preparedPhantom);put(dm3?'PhantomMaster/On':'Unit/48VMaster',powered?1:0);
 for(const g of s.groups?.mute||[]){put(`MuteMaster[${g.n-1}]/On`,g.mute?1:0);put(`MuteMaster[${g.n-1}]/Name`,text(g.name));}
 if(dm3)return;
 put('PY/CardName',s.pyDsp?'PY-DSP':'');
 // Virtual mounts identify devices by model and Yamaha Unit ID, never by a
 // fabricated hardware UUID. Actual network subscriptions are applied on site.
 for(let i=0;i<setup.count('DanteRemoteControl/IOUnit');i++){
  const base=`DanteRemoteControl/IOUnit[${i}]`,box=s.stageboxes?.[i],model=stageboxModel(box?.model);
  put(base+'/DeviceMount',box?1:0);put(base+'/ModelName',model?.name||'');put(base+'/DeviceLabel',box?unitLabel(box.unitId):'');put(base+'/ProductName','');put(base+'/InPortNum',model?.danteOut||0);put(base+'/OutPortNum',model?.inputs||0);put(base+'/WithRecall',box?1:0);
  for(let n=0;n<16;n++)setup.set(base+'/UniqueID',0,n);
  for(let n=0;n<setup.count('DanteRemoteControl/IOUnit/OutputPort');n++)put(`${base}/OutputPort[${n}]/Patch/Source`,0);
 }
 for(let n=0;n<setup.count('DanteNetwork/InputPort');n++)put(`DanteNetwork/InputPort[${n}]/Patch/Source`,0);
 for(const [index,b]of (s.stageboxes||[]).entries())for(let port=0;port<b.inputCount;port++)put(`DanteNetwork/InputPort[${b.inputStart-1+port}]/Patch/Source`,0x44000000+(index+1)*0x1000+port);
}
export async function exportYamahaDM(s,bytes){
 const m=parseMBDF(bytes),p=consoleModel(s),project=sections(m).ProjectInfo;
 if(!project||!['DM3','DM7'].includes(m.product))throw new Error('Base native Yamaha incompatible.');
 project.set('Info/ProductName',p.dm.toUpperCase());project.set('Info/ProductSubName',s.model==='dm3s'?'DM3':s.model.toUpperCase());project.set('Info/Comment',text(s.name,127));
 let current;
 for(const r of m.records.filter(r=>r.group==='Current')){r.modified=applyCurrent(s,await readEntry(r));applySetup(s,r.modified);if(!r.name.endsWith('.old'))current=r.modified;}
 for(const r of m.records.filter(r=>r.group==='Setup')){r.modified=await readEntry(r);applySetup(s,r.modified);}
 if(!current)throw new Error('Mémoire courante Yamaha absente.');
 const id=globalThis.crypto.randomUUID().replaceAll('-','').toUpperCase(),filename=`${id}.${p.dm==='dm3'?'dm3s':p.dm==='dm5'?'dmxs':'dm7s'}`;
 const scene={...current,header:current.header.slice(),records:current.records.filter(r=>r.type==='end'||r.type==='section'&&['Scene','Mixing','Process','FX','PremiumRack'].includes(r.name)).map(r=>({...r,raw:r.raw.slice()}))};
 scene.header.fill(0,12,24);scene.header.set(encoder.encode('Scene'),12);
 // Store the generated state as scene 001 as well as the current memory.
 for(const r of m.records.filter(r=>r.group==='SceneList')){r.modified=await readEntry(r);const list=sections(r.modified).SceneList;list.set('Bank[0]/Info[0]/FileName',filename);if(list.has('Bank[0]/Info[0]/SceneNumber'))list.set('Bank[0]/Info[0]/SceneNumber','001');}
 m.records.splice(m.records.length-1,0,newFileRecord(isDM3(s)?'Scene:A':'Scn/UserA',filename,scene));
 return writeMBDF(m);
}

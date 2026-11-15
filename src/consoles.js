import {stageboxForBank,stageboxModel,stageboxBank,unitLabel} from './yamaha-stageboxes.js';
// One catalogue drives every brand/family/model picker. Keep model IDs stable:
// projects store the model; the brand, family and processing engine are derived.
// Processing capacities are separate from each model's physical connectors.
export const CONSOLE_CATALOG=[
 {id:'behringer',name:'Behringer',families:[{id:'wing',name:'WING',engine:'wing',models:[
  {id:'wing',name:'WING',localInputs:8,localOutputs:8,aux:8,aesOutputs:2},
  {id:'compact',name:'WING COMPACT',localInputs:24,localOutputs:8,aux:2,aesOutputs:2},
  {id:'rack',name:'WING RACK',localInputs:24,localOutputs:8,aux:2,aesOutputs:2}
 ]}]},
 {id:'midas',name:'Midas',families:[{id:'m32',name:'M32',engine:'m32',models:[
  {id:'m32',name:'M32',label:'Midas M32',localInputs:32,localOutputs:16,aux:6,aesOutputs:2},
  {id:'m32r',name:'M32R (Compact)',label:'Midas M32R (Compact)',localInputs:16,localOutputs:8,aux:6,aesOutputs:0}
 ]}]},
 {id:'yamaha',name:'Yamaha',families:[
  {id:'ql',name:'QL',engine:'yamaha-ql',models:[
   {id:'ql1',name:'QL1',label:'Yamaha QL1',localInputs:16,localOutputs:8,channels:32,buses:16,dante:32,slots:2},
   {id:'ql5',name:'QL5',label:'Yamaha QL5',localInputs:32,localOutputs:16,channels:64,buses:16,dante:64,slots:2}
  ]},
  {id:'cl',name:'CL',engine:'yamaha-cl',models:[
   {id:'cl1',name:'CL1',label:'Yamaha CL1',localInputs:8,localOutputs:8,channels:48,buses:24,dante:64,slots:3},
   {id:'cl3',name:'CL3',label:'Yamaha CL3',localInputs:8,localOutputs:8,channels:64,buses:24,dante:64,slots:3},
   {id:'cl5',name:'CL5',label:'Yamaha CL5',localInputs:8,localOutputs:8,channels:72,buses:24,dante:64,slots:3}
  ]},
  {id:'dm',name:'DM',engine:'yamaha-dm',models:[
   {id:'dm3',name:'DM3',label:'Yamaha DM3',localInputs:16,localOutputs:8,channels:16,buses:6,dante:16,usb:18,dm:'dm3'},
   {id:'dm3s',name:'DM3 Standard',label:'Yamaha DM3 Standard',localInputs:16,localOutputs:8,channels:16,buses:6,dante:0,usb:18,dm:'dm3'},
   {id:'dm5c',name:'DM5 Compact',label:'Yamaha DM5 Compact',localInputs:16,localOutputs:16,channels:48,buses:24,dante:64,usb:18,dm:'dm5'},
   {id:'dm5',name:'DM5',label:'Yamaha DM5',localInputs:32,localOutputs:16,channels:60,buses:24,dante:64,usb:18,dm:'dm5'},
   {id:'dm7c',name:'DM7 Compact',label:'Yamaha DM7 Compact',localInputs:16,localOutputs:16,channels:72,buses:48,dante:144,usb:18,aesInputs:0,aesOutputs:2,dm:'dm7'},
   {id:'dm7',name:'DM7',label:'Yamaha DM7',localInputs:32,localOutputs:16,channels:120,buses:48,dante:144,usb:18,aesInputs:4,aesOutputs:4,dm:'dm7'}
  ]}
 ]}
];
const models=Object.fromEntries(CONSOLE_CATALOG.flatMap(brand=>brand.families.flatMap(family=>family.models.map(model=>[model.id,{...model,brand:brand.id,family:family.id,engine:family.engine}]))));
export const CONSOLES=Object.fromEntries(Object.entries(models).map(([id,model])=>[id,model.label||model.name]));
export const consoleModel=s=>models[typeof s==='string'?s:s?.model]||models.wing;
export const consoleBrands=()=>CONSOLE_CATALOG.map(({id,name})=>[id,name]);
export const consoleFamilies=brand=>CONSOLE_CATALOG.find(b=>b.id===brand)?.families.map(({id,name})=>[id,name])||[];
export const consoleOptions=(brand,family)=>CONSOLE_CATALOG.find(b=>b.id===brand)?.families.find(f=>f.id===family)?.models.map(({id,name})=>[id,name])||[];
export const isM32=s=>consoleModel(s).engine==='m32';
export const isYamaha=s=>consoleModel(s).brand==='yamaha';
export const isDM3=s=>consoleModel(s).dm==='dm3';
export const pairedStereo=s=>isM32(s)||isYamaha(s);
export const consoleEngine=s=>consoleModel(s).engine;
export function defaultBank(s,output=false){if(!isYamaha(s))return 'A';const box=(s?.stageboxes||[]).find(b=>ioCapacity(stageboxBank(b),s,output)>0);return box?stageboxBank(box):ioCapacity('DANTE',s)?'DANTE':'LCL';}
export const nativeExtension=s=>isYamaha(s)?(consoleModel(s).dm?['dm5','dm7'].includes(consoleModel(s).dm)?'.dmxf':`.${consoleModel(s).dm}f`:'.CLF'):isM32(s)?'.scn':'.snap';
export const mainOutputPort=s=>ioCapacity('LCL',s,true)-1;
const wingStrips={CH:40,AUX:8,BUS:16,MAIN:4,MTX:8};
const m32Strips={CH:32,AUX:8,FXR:8,BUS:16,MAIN:2,MTX:6};
export function consoleProfile(s){const model=consoleModel(s),name=CONSOLES[model.id];if(isYamaha(s)){const dm3=isDM3(s),dm7=['dm7','dm5'].includes(model.dm),mains=dm3?1:2,matrices=dm3?2:dm7?12:8;return {name,channels:model.channels,buses:model.buses,mains,matrices,fx:dm3?2:dm7?16:8,dca:dm3?0:dm7?(model.dm==='dm5'?12:24):16,mute:dm3?6:dm7?12:8,strips:{CH:model.channels,BUS:model.buses,MAIN:mains,MTX:matrices,...(dm3?{FXB:2}:{})},nameLength:8,gainMin:dm3?0:-6,gainMax:dm3?64:66,hpfMax:dm7?2000:600};}return isM32(s)?{name,channels:32,buses:16,mains:2,matrices:6,fx:8,dca:8,mute:6,strips:m32Strips,nameLength:12,gainMin:-12,gainMax:60,hpfMax:400}:{name,channels:40,buses:16,mains:4,matrices:8,fx:16,dca:16,mute:8,strips:wingStrips,nameLength:16,gainMin:-3,gainMax:45.5,hpfMax:20000};}
export function ioCapacity(bank,s='wing',output=false){const model=consoleModel(s),box=stageboxForBank(s,bank);if(box)return output?box.outputCount:box.inputCount;if(bank==='LCL')return output?model.localOutputs:model.localInputs;if(isYamaha(s)){if(bank==='DANTE')return model.dante;if(bank==='USB')return model.usb||0;if(/^SLOT[123]$/.test(bank))return Number(bank.slice(-1))<=model.slots?16:0;if(bank==='AES')return model.dm?(output?model.aesOutputs||0:model.aesInputs||0):(output?2:0);return 0;}if(bank==='AUX')return model.aux;if(bank==='AES'&&output)return model.aesOutputs;if(isM32(s))return ({A:48,B:48,USB:32})[bank]||0;return ({A:48,B:48,C:48,USB:48,SC:32,CRD:64,MOD:64,AES:2})[bank]||0;}
export function bankOptions(s,output=false){return [...(isYamaha(s)?(s?.stageboxes||[]).map(b=>[stageboxBank(b),`${b.name} · ${unitLabel(b.unitId)} · ${stageboxModel(b.model)?.name||b.model}`]):[]),...Object.entries(isYamaha(s)?{LCL:output?'OMNI OUT / Local':'Local / OMNI IN',DANTE:'Dante',USB:'USB',SLOT1:'Slot 1',SLOT2:'Slot 2',SLOT3:'Slot 3',AES:'AES/EBU'}:isM32(s)?{LCL:'Local',AUX:output?'Aux Out':'Aux In',A:'AES50 A',B:'AES50 B',USB:'Carte USB / Card',AES:'AES/EBU'}:{LCL:'Local',AUX:'Aux',A:'AES50 A',B:'AES50 B',C:'AES50 C',USB:'USB',SC:'StageConnect',CRD:'WING-LIVE',MOD:'Module',AES:'AES/EBU'}).filter(([bank])=>ioCapacity(bank,s,output)>0)].filter(([bank])=>ioCapacity(bank,s,output)>0);}
export const physicalWidth=c=>c.mode==='M'?1:2;
export function inputGainRange(s,bank){const p=consoleProfile(s);return stageboxForBank(s,bank)?{min:-6,max:66}:{min:p.gainMin,max:p.gainMax};}
export const logicalWidth=(s,c)=>pairedStereo(s)&&c.mode==='ST'&&c.source!=='MAIN'?2:1;
export function occupiedNumbers(s,c){const n=c.source?c.bus:c.n;return Array.from({length:logicalWidth(s,c)},(_,i)=>n+i);}
export const channelCount=s=>s.channels.reduce((n,c)=>n+logicalWidth(s,c),0)+(['dm5','dm7'].includes(consoleModel(s).dm)?(s.fx||[]).filter(f=>f.usage==='send').length*2:0);
export const busCount=s=>[...(s.outputs||[]),...(s.mixes||[])].filter(m=>m.source==='BUS').reduce((n,m)=>n+logicalWidth(s,m),0);
export function nextFreeNumber(s,kind='CH',mode='M'){const records=kind==='CH'?s.channels:[...(s.outputs||[]),...(s.mixes||[])].filter(m=>m.source===kind),used=new Set([...records.flatMap(c=>occupiedNumbers(s,c)),...(kind==='CH'&&['dm5','dm7'].includes(consoleModel(s).dm)?(s.fx||[]).filter(f=>f.usage==='send').flatMap(f=>[f.returnN,f.returnN+1]):[])]),max=consoleProfile(s).strips[kind],width=logicalWidth(s,{mode,source:kind==='CH'?undefined:kind});return Array.from({length:max},(_,i)=>i+1).find(n=>n+width-1<=max&&(width===1||n%2===1)&&Array.from({length:width},(_,i)=>n+i).every(v=>!used.has(v)));}

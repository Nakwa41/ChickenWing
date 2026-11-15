// Dedicated EQ resources are independent from the FX and Premium racks.
// DM Editor 2.0.1 captures + Yamaha DM7 RM pp.345–346 / DM5 UG pp.313–314.
import {consoleModel,consoleProfile,isDM3} from './consoles.js';
export function yamahaEqCatalog(s,rack='eq'){
 const m=consoleModel(s);
 if(rack==='channel')return isDM3(s)?[
  {id:'CHANNEL_PEQ',name:'EQ paramétrique de tranche · 4 bandes',kind:'peq',bands:4,inputs:2,outputs:2,size:1,placement:'channel',allowedTargets:['CH','BUS','MAIN','MTX'],values:[],rack},
  {id:'OUTPUT_GEQ',name:'GEQ de sortie · 31 bandes / 15 réglables',kind:'geq',bands:31,maxActiveBands:15,inputs:2,outputs:2,size:1,placement:'channel',allowedTargets:['BUS','MAIN'],values:[],rack}
 ]:[];
 const cl=['cl','ql'].includes(m.family);if(!cl&&!['dm5','dm7'].includes(m.dm))return [];
 return [
  {id:'31BandGEQ',name:'31BandGEQ · Mono',kind:'geq',bands:31,inputs:1,outputs:1,size:1,items:1,nativeType:'31BandGEQ'},
  {id:'31BandGEQ St',name:'31BandGEQ · Stereo (2 unités)',kind:'geq',bands:31,inputs:2,outputs:2,size:2,items:1,nativeType:'31BandGEQ'},
  {id:'Flex15GEQ',name:'Flex15GEQ · Dual / Stereo',kind:'geq',bands:31,maxActiveBands:15,inputs:2,outputs:2,size:1,items:2,dual:true,nativeType:'Flex15GEQ'},
  {id:'8BandPEQ',name:'8BandPEQ · Dual / Stereo',kind:'peq',bands:8,inputs:2,outputs:2,size:1,items:2,dual:true,nativeType:'8BandPEQ'}
 ].map(f=>({...f,referenceOnly:cl&&!f.id.startsWith('31BandGEQ'),rack,placement:'insert',values:[],allowedTargets:cl?['BUS','MAIN','MTX']:['CH','BUS','MAIN','MTX']}));
}
export function yamahaEqCapacity(s,rack){return rack==='channel'?128:consoleModel(s).dm==='dm5'?24:consoleModel(s).dm==='dm7'?32:['cl','ql'].includes(consoleModel(s).family)?16:0;}
export function writeDMEq(s,mix,f,targets){
 const info=yamahaEqCatalog(s,f.rack).find(i=>i.id===f.model);if(!info)throw Error(`Égaliseur Yamaha inconnu : ${f.model}`);
 if(f.rack==='channel'){
  for(const t of targets){const base=`${{CH:'InputChannel',BUS:'Mix',MTX:'Matrix',MAIN:'Stereo'}[t.kind]}[${t.index}]`,geq=f.model==='OUTPUT_GEQ',path=base+(geq?'/GEQ':'/PEQ');mix.set(path+'/On',f.bypass?0:1);
   if(geq)for(let b=0;b<31;b++)mix.set(`${path}/Band[${b}]/Gain`,Math.round((f.eqBands?.[b]||0)*100));
  }return;
 }
 const first=f.slot-1;
 for(let unit=0;unit<info.size;unit++){
  const b=`GEQRack2[${first+unit}]`;mix.set(b+'/Type',info.nativeType);mix.set(b+'/SlotSize',1);mix.set(b+'/ItemNum',info.items);mix.set(b+'/GEQLink',0);mix.set(b+'/GEQLRLink',info.kind==='geq'&&info.items===2&&targets.length>1&&!f.rightTarget?1:0);mix.set(b+'/PEQLRLink',info.kind==='peq'&&targets.length>1&&!f.rightTarget?1:0);
  for(let ab=0;ab<2;ab++){mix.set(`${b}/AB[${ab}]/On`,f.bypass?0:1);mix.set(`${b}/AB[${ab}]/Patch/Source`,0);if(info.kind==='geq'){mix.set(`${b}/AB[${ab}]/GEQ/Limit`,'+15dB_-15dB');for(let band=0;band<31;band++)mix.set(`${b}/AB[${ab}]/GEQ/Band[${band}]/Gain`,Math.round((f.eqBands?.[band]||0)*100));}}
 }
 for(const t of targets){const unit=info.size===2?t.side:0,ab=info.size===2?0:t.side,b=`GEQRack2[${first+unit}]/AB[${ab}]`,group={CH:'InputChannel',BUS:'Mix',MTX:'Matrix',MAIN:'Stereo'}[t.kind],insert=`${group}[${t.index}]/Insert`;
  mix.set(b+'/Patch/Source',({CH:0x13c00000,BUS:0x13e00000,MTX:0x14000000,MAIN:0x14200000})[t.kind]+(f.insertSlot-1)*0x1000+t.index);
  mix.set(insert+'/On',1);mix.set(insert+'/Point',f.position==='preins'?60:100);mix.set(`${insert}/Module[${f.insertSlot-1}]/Patch/Source`,0x06800000+(first+unit)*16+ab);
 }
}

// CL/QL Editor 5.8.1 MEMAPI v7: gains are dB × 10, band-major (19 units).
export function writeCLEq(s,mem,f,targets,layout){
 const v=new DataView(mem.buffer,mem.byteOffset,mem.byteLength),info=yamahaEqCatalog(s).find(i=>i.id===f.model),setBit=(offset,n,on)=>{const i=offset+Math.floor(n/8),mask=1<<(n%8);mem[i]=on?mem[i]|mask:mem[i]&~mask;};
 for(let unit=0;unit<info.size;unit++){const slot=f.slot-1+unit;mem[21684+slot]=1;setBit(21752,slot,!f.bypass);for(let b=0;b<31;b++)v.setInt16(21802+b*38+slot*2,Math.round((f.eqBands?.[b]||0)*10));}
 for(const t of targets){const slot=f.slot-1+(info.size===2?t.side:0),x=layout[t.kind],n=t.index;setBit(x.on,n,true);mem[x.point+n]=f.position==='preins'?0:1;mem[(f.insertSlot===2?x.second:x.patch)+n]=155+slot*2;v.setUint16(30456+slot*2,x.code+n+(f.insertSlot===2?(t.kind==='CH'?396:412):0));}
}

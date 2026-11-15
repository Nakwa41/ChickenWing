import {writeCLEq} from './yamaha-eq.js';
import {yamahaEffectInfo,yamahaRack,yamahaInsertTargets,yamahaParameterValues} from './yamaha-effects.js';
import {getMixes} from './routing.js';
import {consoleProfile,logicalWidth} from './consoles.js';
import {getAssignment} from './groups.js';
import {ascii,section} from './yamaha-binary.js';
const encoder=new TextEncoder(),view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const name=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ');
const bit=(b,offset,n,on)=>{const i=offset+Math.floor(n/8),mask=1<<(n%8);b[i]=on?b[i]|mask:b[i]&~mask;};
const hpf=[20,21.2,22.4,23.6,25,26.5,28,30,31.5,33.5,35.5,37.5,40,42.5,45,47.5,50,53,56,60,63,67,71,75,80,85,90,95,100,106,112,118,125,132,140,150,160,170,180,190,200,212,224,236,250,265,280,300,315,335,355,375,400,425,450,475,500,530,560,600];
export function yamahaFader(db){if(db<=-144)return 0;if(db<=-96)return Math.max(1,Math.round((db+141)/3));if(db<=-78)return Math.round(db+111);if(db<=-40)return Math.round((db+78)/.2+33);if(db<=-20)return Math.round((db+40)/.1+223);return Math.round(db/.05+823);}
export function parseCLF(bytes){
 const b=new Uint8Array(bytes),v=view(b),seen=new Set();
 if(b.length<48||v.getUint16(0)!==0x100||v.getUint16(8)!==0x170||v.getUint16(10)!==0x5c0)throw new Error('Base CL/QL invalide.');
 function read(pos,depth=0){
  if(depth>8||seen.has(pos)||pos+8>b.length)throw new Error('Arbre CLF invalide.');seen.add(pos);
  const type=v.getUint16(pos),size=v.getUint32(pos+4);if(pos+8+size>b.length)throw new Error('Bloc CLF tronqué.');
  if(type===0x300)return {type,body:b.slice(pos+8,pos+8+size)};
  if(type!==0x100||![8,40].includes(size))throw new Error('Collection CLF inconnue.');
  const body=b.slice(pos+8,pos+8+size),count=v.getUint16(pos+12),idx=pos+8+size;
  if(v.getUint16(idx)!==0x200||v.getUint32(idx+4)!==count*8)throw new Error('Index CLF invalide.');
  const children=[];for(let i=0;i<count;i++){const a=idx+8+i*8;children.push({id:v.getUint16(a),node:read(v.getUint32(a+4),depth+1)});}return {type,body,children};
 }
 return read(0);
}
export function writeCLF(tree){
 function size(n){return 8+n.body.length+(n.children?8+n.children.length*8+n.children.reduce((sum,c)=>sum+size(c.node),0):0);}
 const out=new Uint8Array(size(tree)),v=view(out);
 function write(n,offset){v.setUint16(offset,n.type);v.setUint32(offset+4,n.body.length);out.set(n.body,offset+8);if(!n.children)return;const idx=offset+8+n.body.length;v.setUint16(idx,0x200);v.setUint32(idx+4,n.children.length*8);let p=idx+8+n.children.length*8;for(let i=0;i<n.children.length;i++){const c=n.children[i];v.setUint16(idx+8+i*8,c.id);v.setUint32(idx+12+i*8,p);write(c.node,p);p+=size(c.node);}}
 write(tree,0);return out;
}
export function clfMemory(scene){const b=scene.body,v=view(b);let p=0;while(p+20<=b.length){const size=v.getUint32(p+16,true);if(v.getUint16(p,true)!==0x6cff||p+20+size>b.length)throw new Error('Scène CLF invalide.');if(ascii(b,p+8,p+16)==='MEMAPI')return b.subarray(p+20,p+20+size);p+=20+size;}throw new Error('Mémoire CLF absente.');}
export function fixCLChecksum(b){const v=view(b);let sum=0;for(let n=0;n<b.length-4;n+=4)sum=(sum+v.getUint32(n))>>>0;v.setUint32(b.length-4,(~sum)>>>0);}
export function clInputCode(s,bank,n){if(bank==='DANTE')return n;if(bank==='LCL')return n<=8?64+n:184+n;if(/^SLOT[123]$/.test(bank))return 74+(Number(bank.slice(-1))-1)*16+n;throw new Error('Interface CL/QL non gérée.');}
export const clOutputCode=(o,side=0)=>o.source==='MAIN'?(o.bus===1?33+side:35):o.source==='BUS'?o.bus+side:24+o.bus+side;
export function clOutputOffset(bank,port){if(bank==='LCL')return 30200+(port-1)*2;if(bank==='DANTE')return 30232+(port-1)*2;if(/^SLOT[123]$/.test(bank))return 30360+(port-1)*6+(Number(bank.slice(-1))-1)*2;if(bank==='AES')return 30600+(port-1)*2;throw new Error('Interface de sortie CL/QL non gérée.');}
export function clfPremium(scene){const b=scene.body,v=view(b);let p=0;while(p+20<=b.length){const size=v.getUint32(p+16,true);if(p+20+size>b.length)break;if(ascii(b,p+20,p+28)==='MMSXLIT'){const result=section({raw:b,body:p+20,length:size});if(result.root.name==='PremiumRack')return result;}p+=20+size;}throw new Error('Paramètres Premium Rack CL/QL absents.');}
function apply(s,mem,premium){
 if(mem.length!==39452||view(mem).getUint16(16)!==7)throw new Error('La base CL/QL doit être au format 7 (Editor 5.8.1).');
 const v=view(mem),p=consoleProfile(s),color={Batterie:1,Basse:3,Guitares:0,Claviers:7,Voix:6,Autres:8};
 const putName=(offset,count,n,text)=>{const raw=encoder.encode(name(text).slice(0,8).padEnd(8,'\0'));mem.set(raw.subarray(0,4),offset+n*4);mem.set(raw.subarray(4),offset+count*4+n*4);};
 const putLevel=(offset,n,db)=>v.setUint16(offset+n*2,yamahaFader(db));
 const assign=(key,n)=>{const a=getAssignment(s,key);for(let g=0;g<16;g++)bit(mem,10004+g*12,n,a.dcas.includes(g+1));for(let g=0;g<8;g++)bit(mem,9908+g*12,n,a.mutes.includes(g+1));};
 mem.fill(0,1373,1377); // local phantom mask
 for(let n=0;n<96;n++){bit(mem,2382,n,false);putLevel(2586,n,-144);mem[28971+n]=0;putName(29240,96,n,'');assign(`CH.${n+1}`,n);bit(mem,10196,n,false);bit(mem,10208,n,false);for(let bus=0;bus<24;bus++){bit(mem,10448+bus*216,n,false);putLevel(10472+bus*216,n,-144);}for(let mtx=0;mtx<8;mtx++){bit(mem,16820+mtx*216,n,false);putLevel(16844+mtx*216,n,-144);}}
 mem.fill(0,28808,28904);let linkGroup=1;
 for(const c of s.channels){for(let side=0;side<logicalWidth(s,c);side++){
  const n=c.n-1+side;putName(29240,96,n,c.name);mem[30104+n]=color[c.category]??8;mem[28971+n]=clInputCode(s,c.bank,c.input+side);bit(mem,2382,n,!c.mute);putLevel(2586,n,c.fader);mem[2490+n]=c.mode==='ST'?(side?63:193):Math.round((c.pan||0)*.63)&255;bit(mem,10196,n,c.main);bit(mem,10208,n,!!c.mainSends?.[2]?.on);
  if(c.mode==='ST')mem[28808+n]=linkGroup;for(let pair=0;pair<12;pair++)mem[15632+pair*96+n]=c.mode==='ST'?(side?63:193):0;for(let pair=0;pair<4;pair++)mem[18548+pair*96+n]=c.mode==='ST'?(side?63:193):0;
  bit(mem,6692,n,c.hpf>0);mem[6704+n]=4+hpf.reduce((best,x,i)=>Math.abs(Math.log(x/(c.hpf||80)))<Math.abs(Math.log(hpf[best]/(c.hpf||80)))?i:best,0);
  if(c.bank==='LCL'){mem[1377+c.input-1+side]=Math.round(c.gain+6);bit(mem,1373,c.input-1+side,c.phantom);}assign(`CH.${c.n}`,n);
  for(const [kind,field,base]of [['BUS','sends',10448],['MTX','matrixSends',16820]])for(const [bus,send]of Object.entries(c[field]||{})){const target=Number(bus)-1;bit(mem,base+target*216,n,send.on);bit(mem,base+12+target*216,n,send.tap==='PRE');putLevel(base+24+target*216,n,send.tap==='GRP'?0:send.level);const pair=[...s.outputs,...(s.mixes||[])].find(m=>m.source===kind&&m.bus===Number(bus)&&m.mode==='ST');if(pair){bit(mem,base+(target+1)*216,n,send.on);bit(mem,base+12+(target+1)*216,n,send.tap==='PRE');putLevel(base+24+(target+1)*216,n,send.level);}}
 }if(c.mode==='ST')linkGroup++;}
 // Bus configuration is global per pair; the scene stores the signal type too.
 for(let n=0;n<24;n++){bit(mem,1282,n,false);bit(mem,19166,n,false);mem[1288+n]=1;bit(mem,20621,n,false);bit(mem,20624,n,false);mem[19094+n]=0;}
 for(let n=0;n<8;n++){bit(mem,1315,n,false);bit(mem,20796,n,false);}
 const allMixes=[...s.outputs,...(s.mixes||[])];
 for(const m of allMixes.filter(m=>m.mode==='ST'&&m.source!=='MAIN'))for(let side=0;side<2;side++){const n=m.bus-1+side;bit(mem,m.source==='BUS'?1282:1315,n,true);bit(mem,m.source==='BUS'?19166:20796,n,true);}
 for(let n=0;n<24;n++)if(s.channels.some(c=>c.sends?.[n+1]?.on&&c.sends[n+1].tap==='GRP')){mem[1288+n]=2;mem[1288+(n%2?n-1:n+1)]=2;}
 // Output MIX -> MATRIX has 24 sources; ST L/R and MONO have their own table.
 const outputSend=(kind,source,n,send)=>{
  const levels=(kind==='BUS'?20096:21290)+(n-1)*(kind==='BUS'?54:8),on=kind==='BUS'?(n===1?20089:levels-6):(n===1?21287:levels-2),pre=kind==='BUS'?(n===1?20092:levels-3):(n===1?21288:levels-1);
  bit(mem,on,source,!!send?.on);bit(mem,pre,source,send?.tap==='PRE');putLevel(levels,source,send?.level??-144);
 };
 for(let n=1;n<=8;n++){for(let src=0;src<24;src++)outputSend('BUS',src,n);for(let src=0;src<3;src++)outputSend('MAIN',src,n);}
 for(const [kind,max,offset,on,levels,names,count]of [['BUS',24,0,19091,19118,30604,24],['MTX',8,0,20771,20780,30796,8],['MAIN',3,0,21146,21150,30860,3]])for(let n=0;n<max;n++){bit(mem,on,n,false);putLevel(levels,n,-144);putName(names,count,n,'');}
 // Physical patch tables, including unexposed ports in the shared CL/QL layout.
 mem.fill(0,30200,30456);mem.fill(0,30600,30604);
 for(const [dca,base,stride]of [[true,20681,3],[false,20657,3],[true,21112,1],[false,21104,1],[true,21373,1],[false,21365,1]])mem.fill(0,base,base+(dca?16:8)*stride);
 mem.fill(0,21490,21522); // native DCA input/output membership counts
 for(let n=1;n<=p.channels;n++)for(const g of getAssignment(s,`CH.${n}`).dcas)mem[21490+g-1]++;
 for(const o of [...s.outputs,...(s.mixes||[])]){
  const max=o.source==='BUS'?24:o.source==='MTX'?8:3,names=o.source==='BUS'?30604:o.source==='MTX'?30796:30860,on=o.source==='BUS'?19091:o.source==='MTX'?20771:21146,levels=o.source==='BUS'?19118:o.source==='MTX'?20780:21150;
  const first=o.source==='MAIN'?(o.bus===1?0:2):o.bus-1,width=o.source==='MAIN'&&o.bus===1?2:logicalWidth(s,o);
  for(let side=0;side<width;side++){const n=first+side;putName(names,max,n,o.name);bit(mem,on,n,!o.mute);putLevel(levels,n,o.fader);}
  if(o.source==='BUS')for(let side=0;side<width;side++){bit(mem,20621,first+side,!!o.mainSends?.[1]?.on);bit(mem,20624,first+side,!!o.mainSends?.[2]?.on);}
  if(['BUS','MAIN'].includes(o.source))for(const [n,send]of Object.entries(o.matrixSends||{}))for(let side=0;side<width;side++){outputSend(o.source,first+side,Number(n),send);const pair=allMixes.find(m=>m.source==='MTX'&&m.bus===Number(n)&&m.mode==='ST');if(pair)outputSend(o.source,first+side,Number(n)+1,send);}
  if(o.bank)for(let side=0;side<(o.mode==='ST'?2:1);side++)v.setUint16(clOutputOffset(o.bank,o.port+side),clOutputCode(o,side));
 }
 for(const [kind,max,dcaBase,muteBase,stride]of [['BUS',p.buses,20681,20657,3],['MTX',p.matrices,21112,21104,1],['MAIN',3,21373,21365,1]])for(let n=0;n<max;n++){const a=getAssignment(s,`${kind}.${kind==='MAIN'?(n<2?1:2):n+1}`);for(const g of a.dcas){bit(mem,dcaBase+(g-1)*stride,n,true);mem[21506+g-1]++;}for(const g of a.mutes)bit(mem,muteBase+(g-1)*stride,n,true);}
 for(const g of s.groups?.dca||[]){putName(21524,16,g.n-1,g.name);putLevel(21458,g.n-1,g.fader);bit(mem,21389,g.n-1,g.mute);}
 mem[1264]=0;for(const g of s.groups?.mute||[]){putName(34392,8,g.n-1,g.name);bit(mem,1264,g.n-1,g.mute);}
 // CL/QL inserts 1 and 2 share one ON switch and one insertion point.
 const insertLayout={CH:{on:1962,point:1974,patch:29067,second:34456,code:45,count:96},BUS:{on:19064,point:19067,patch:29163,second:34552,code:117,count:24},MTX:{on:20762,point:20763,patch:29187,second:34576,code:141,count:8},MAIN:{on:21142,point:21143,patch:29195,second:34584,code:149,count:3}};
 for(const x of Object.values(insertLayout))for(let n=0;n<x.count;n++){bit(mem,x.on,n,false);mem[x.point+n]=0;mem[x.patch+n]=0;mem[x.second+n]=0;}
 // ST IN uses the console's reserved link groups, with a centred stereo balance.
 for(let n=0;n<16;n++)mem[28808+72+n]=52+Math.floor(n/2);
 mem.fill(0,30456,30520);mem.fill(0,21752,21755);for(let slot=0;slot<16;slot++)for(let b=0;b<31;b++)v.setInt16(21802+b*38+slot*2,0);
 mem[25340]=255;for(let n=0;n<8;n++){for(const base of [30532,30548,30564,30580])v.setUint16(base+n*2,0);premium.set(`Slot[${n}]/Plugin/PluginName`,'');for(let side=0;side<2;side++)premium.set(`Slot[${n}]/Plugin/LR[${side}]/Bypass`,1);}
 for(const f of s.fx||[]){
  if(f.rack==='eq'){writeCLEq(s,mem,f,yamahaInsertTargets(s,f),insertLayout);continue;}
  const info=yamahaEffectInfo(s,f.model),slot=f.slot-1,pr=yamahaRack(f)==='premium',portBase=pr?30564:30532,sourceBase=(pr?139:123)+slot*2;
  if(pr){const b=`Slot[${slot}]/Plugin`;premium.set(b+'/PluginName',info.id);for(let side=0;side<info.items;side++){premium.set(`${b}/LR[${side}]/LibraryName`,info.library.slice(0,16));premium.set(`${b}/LR[${side}]/Bypass`,f.bypass?1:0);for(let n=0;n<64;n++)premium.set(`${b}/LR[${side}]/Parameter[${n}]/Value`,yamahaParameterValues(s,f,info,side)[n]||0);}}
  else{for(let part=0;part<4;part++)mem.set(encoder.encode(info.library.slice(0,16).padEnd(16,' ').slice(part*4,part*4+4)),25188+part*32+slot*4);bit(mem,25340,slot,f.bypass);mem[25357+slot]=f.mix;mem[25365+slot]=info.type;for(let n=0;n<32;n++)v.setInt32(25376+n*32+slot*4,yamahaParameterValues(s,f,info)[n]||0);}
  if(f.usage==='send'){
   v.setUint16(portBase+slot*2,f.sendLeft);v.setUint16(portBase+16+slot*2,f.sendRight||0);
   for(let side=0;side<2;side++){
    const n=72+(f.returnN-1)*2+side;mem[28971+n]=sourceBase+(info.outputs===1?0:side);putName(29240,96,n,`${pr?'PR':'FX'}${f.slot} RTN`);mem[30104+n]=3;bit(mem,2382,n,!f.returnMute);putLevel(2586,n,f.returnLevel);mem[2490+n]=0;bit(mem,10196,n,f.main);bit(mem,10208,n,!!f.mainSends?.[2]?.on);
    for(const [kind,field,base]of [['BUS','sends',10448],['MTX','matrixSends',16820]])for(const [bus,send]of Object.entries(f[field]||{})){const first=Number(bus)-1,pair=getMixes(s).find(m=>m.source===kind&&m.bus===Number(bus)&&m.mode==='ST');for(let target=first;target<=first+(pair?1:0);target++){bit(mem,base+target*216,n,send.on);bit(mem,base+12+target*216,n,send.tap==='PRE');putLevel(base+24+target*216,n,send.level);}}
   }
  }else{
   // Insert 2 adds sixteen ST IN sources before MIX/MATRIX/Stereo in the port enum.
   for(const t of yamahaInsertTargets(s,f)){const x=insertLayout[t.kind],n=t.index;bit(mem,x.on,n,true);mem[x.point+n]=f.position==='preins'?0:1;mem[(f.insertSlot===2?x.second:x.patch)+n]=sourceBase+(info.outputs===1?0:t.side);v.setUint16(portBase+slot*2+t.side*16,x.code+n+(f.insertSlot===2?(t.kind==='CH'?396:412):0));}
  }
 }
 mem.fill(32,0,16);mem.set(encoder.encode(name(s.name).slice(0,16)),0);fixCLChecksum(mem);
}
export function exportYamahaCL(s,bytes){const tree=parseCLF(bytes),scenes=tree.children.find(c=>c.id===0x10)?.node,current=scenes?.children.find(c=>c.id===65534)?.node;if(!current)throw new Error('Mémoire courante CL/QL introuvable.');apply(s,clfMemory(current),clfPremium(current));const stored=scenes.children.find(c=>c.id===1);if(!stored)throw new Error('Emplacement de scène 001 absent.');stored.node={type:0x300,body:current.body.slice()};return writeCLF(tree);}

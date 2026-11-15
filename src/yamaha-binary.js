// Yamaha MBDF: containers and their embedded, self-describing parameter trees.
// Layout notes and independent interoperability research: docs/YAMAHA.md.
const decoder=new TextDecoder(),encoder=new TextEncoder();
export const ascii=(b,start=0,end=b.length)=>decoder.decode(b.subarray(start,end)).split('\0')[0];
const align=n=>(n+3)&~3;
export const concat=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length;}return out;};
const view=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);
async function transform(bytes,compress){const stream=new Blob([bytes]).stream().pipeThrough(compress?new CompressionStream('deflate'):new DecompressionStream('deflate'));const result=new Uint8Array(await new Response(stream).arrayBuffer());if(result.length>16*1024*1024)throw new Error('Bloc Yamaha trop volumineux.');return result;}
export function parseMBDF(bytes){
 const b=new Uint8Array(bytes),v=view(b),records=[];
 if(b.length<72||b.length>32*1024*1024||ascii(b,0,12)!=='#YAMAHA MBDF')throw new Error('Fichier Yamaha MBDF invalide.');
 let p=72;
 while(p<b.length){
  const tag=ascii(b,p,p+12);
  if(tag==='#END'){records.push({type:'end',raw:b.slice(p)});p=b.length;break;}
  if(p+36>b.length)throw new Error('En-tête Yamaha incomplet.');
  if(tag==='#MMS FIELD'||tag==='#MMS FACADE'){
   const ext=v.getUint32(p+24),size=v.getUint32(p+28),body=p+36+ext,end=align(body+size);
   if(end>b.length||size<88||ascii(b,body,body+8)!=='MMSXLIT')throw new Error('Section Yamaha non prise en charge.');
   records.push({type:'section',name:ascii(b,p+12,p+24),raw:b.slice(p,end),body:36+ext,length:size});p=end;
  }else if(tag==='#FILE'){
   if(p+44>b.length)throw new Error('Entrée Yamaha incomplète.');
   const size=v.getUint32(p+28),len=v.getUint16(p+36),data=align(p+44+len),end=align(data+size);
   if(len>200||v.getUint32(p+24)!==len+8||end>b.length)throw new Error('Taille de fichier Yamaha invalide.');
   records.push({type:'file',group:ascii(b,p+12,p+24),name:ascii(b,p+44,p+44+len),raw:b.slice(p,end),header:b.slice(p,data),compressed:b.slice(data,data+size)});p=end;
  }else throw new Error(`Bloc Yamaha inconnu : ${tag}.`);
  if(records.length>4000)throw new Error('Trop de blocs Yamaha.');
 }
 if(records.at(-1)?.type!=='end')throw new Error('Fin de fichier Yamaha manquante.');
 return {header:b.slice(0,72),kind:ascii(b,12,24),product:ascii(b,36,52),records};
}
export async function readEntry(record){return parseMBDF(await transform(record.compressed,false));}
export async function writeMBDF(m){
 const parts=[m.header];for(const r of m.records){if(r.modified){const comp=await transform(await writeMBDF(r.modified),true),h=r.header.slice();view(h).setUint32(28,comp.length);parts.push(h,comp,new Uint8Array(align(comp.length)-comp.length));}else parts.push(r.raw);}return concat(parts);
}
export function section(record){
 const b=record.raw,v=view(b),base=record.body,schemaSize=v.getUint32(base+80,true),size=v.getUint32(base+84,true),data=base+88+schemaSize,end=base+88+schemaSize;
 if(data+size>base+record.length)throw new Error('Paramètres Yamaha incomplets.');
 let nodes=0;
 function tree(pos,depth=0){
  if(++nodes>5000||depth>24||pos+48>end||ascii(b,pos,pos+4)!=='COL0')throw new Error('Schéma Yamaha invalide.');
  const prBytes=v.getUint32(pos+28,true),kidBytes=v.getUint32(pos+32,true),node={name:ascii(b,pos+4,pos+28),offset:v.getUint32(pos+36,true),size:v.getUint32(pos+40,true),count:v.getUint32(pos+44,true),params:{},children:{}};
  let q=pos+48,byte=0,bit=null;
  if(prBytes%32||q+prBytes+kidBytes>end)throw new Error('Schéma Yamaha tronqué.');
  for(const stop=q+prBytes;q<stop;q+=32){
   if(ascii(b,q,q+3)!=='PR ')throw new Error('Paramètre Yamaha invalide.');
   const pr={type:b[q+3],size:v.getUint16(q+4,true),count:v.getUint16(q+6,true)};
   if(pr.size===0){bit??=byte*8;pr.offset=Math.floor(bit/8);pr.bit=bit%8;bit+=pr.count;byte=Math.ceil(bit/8);}else{bit=null;pr.offset=byte;byte+=pr.size*pr.count;}
   node.params[ascii(b,q+8,q+32)]=pr;
  }
  const stop=q+kidBytes;while(q<stop){const child=tree(q,depth+1);node.children[child.node.name]=child.node;q=child.end;}
  if(q!==stop||byte>node.size)throw new Error('Disposition Yamaha invalide.');
  for(const child of Object.values(node.children))if(child.offset+child.size*child.count>node.size)throw new Error('Collection Yamaha hors limites.');
  return {node,end:q};
 }
 const parsed=tree(base+88);if(parsed.end!==end)throw new Error('Fin de schéma Yamaha invalide.');const root=parsed.node;
 function locate(path,arr=0){
  const parts=path.split('/');let node=root,offset=data;
  for(const part of parts.slice(0,-1)){const match=part.match(/^([^\[\]]+)(?:\[(\d+)\])?$/);if(!match)throw new Error(`Chemin Yamaha invalide : ${path}`);node=node.children[match[1]];const index=Number(match[2]||0);if(!node||index>=node.count)throw new Error(`Collection Yamaha absente : ${path}`);offset+=node.offset+node.size*index;}
  const pr=node.params[parts.at(-1)];if(!pr||arr>=pr.count)throw new Error(`Paramètre Yamaha absent : ${path}`);
  offset+=pr.offset+(pr.size?arr*pr.size:Math.floor((pr.bit+arr)/8));if(offset+(pr.size||1)>data+size)throw new Error('Adresse Yamaha hors limites.');
  return {pr,offset,bit:pr.size?null:(pr.bit+arr)%8};
 }
 function get(path,arr=0){const {pr,offset:o,bit}=locate(path,arr);if(bit!==null)return (b[o]>>bit)&1;if(pr.type===0)return ascii(b,o,o+pr.size);if(pr.size===1)return pr.type===1?v.getInt8(o):b[o];if(pr.size===2)return pr.type===1?v.getInt16(o,true):v.getUint16(o,true);if(pr.size===4)return pr.type===1?v.getInt32(o,true):v.getUint32(o,true);throw new Error('Taille de paramètre Yamaha inconnue.');}
 function set(path,value,arr=0){const {pr,offset:o,bit}=locate(path,arr);if(bit!==null)b[o]=(b[o]&~(1<<bit))|((value?1:0)<<bit);else if(pr.type===0){b.fill(0,o,o+pr.size);const raw=encoder.encode(String(value));if(raw.length>=pr.size)throw new Error(`Texte Yamaha trop long : ${path}`);b.set(raw,o);}else if(pr.size===1)v.setUint8(o,value);else if(pr.size===2)pr.type===1?v.setInt16(o,value,true):v.setUint16(o,value,true);else if(pr.size===4)pr.type===1?v.setInt32(o,value,true):v.setUint32(o,value,true);else throw new Error('Taille de paramètre Yamaha inconnue.');}
 function count(path){let n=root;for(const part of path.split('/')){n=n.children[part];if(!n)return 0;}return n.count;}
 return {root,get,set,count,has:path=>{try{locate(path);return true;}catch{return false;}},function:ascii(b,base+8,base+40)};
}
export function sections(m){return Object.fromEntries(m.records.filter(r=>r.type==='section').map(r=>{const s=section(r);return [s.function,s];}));}
export function newFileRecord(group,name,m){const fn=encoder.encode(name),header=new Uint8Array(align(44+fn.length)),v=view(header);header.set(encoder.encode('#FILE'));header.set(encoder.encode(group),12);v.setUint32(24,fn.length+8);v.setUint16(36,fn.length);v.setUint32(40,8);header.set(fn,44);return {type:'file',group,name,header,modified:m};}

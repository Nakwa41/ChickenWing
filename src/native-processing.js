// Keep verified raw processing banks within their own format; never reinterpret
// Yamaha parameter indices or M32 strings as another manufacturer's units.
export const DM_PROCESSING_KEYS=new Set(['Input','HPF','LPF','PEQ','Proc','Dynamics','Delay','Gate','Compressor']);
export function captureDMProcessing(section,group,index,family){
 const node=section.root.children[group];if(!node)return null;const values=[];
 function walk(n,p){for(const[key,pr]of Object.entries(n.params))for(let arr=0;arr<pr.count;arr++)values.push({path:p+'/'+key,arr,value:section.get(`${group}[${index}]/${p}/${key}`,arr)});for(const[key,child]of Object.entries(n.children))for(let i=0;i<child.count;i++)walk(child,p+'/'+key+(child.count>1?`[${i}]`:''));}
 for(const[key,child]of Object.entries(node.children))if(DM_PROCESSING_KEYS.has(key))for(let i=0;i<child.count;i++)walk(child,key+(child.count>1?`[${i}]`:''));
 return {family,values};
}
export function applyDMProcessing(section,base,state,family){
 const bank=state?.nativeProcessingDM;if(bank?.family!==family||!Array.isArray(bank.sides))return;
 const side=Number(base.match(/\[(\d+)\]/)?.[1]||0)-(state.n?state.n-1:state.source==='MAIN'?(state.bus-1)*2:state.bus-1),values=bank.sides[side]||bank.sides[0];
 for(const v of values||[]){if(!DM_PROCESSING_KEYS.has(v.path.split('/')[0].replace(/\[\d+\]$/,'')))continue;const path=base+'/'+v.path;if(section.has(path))section.set(path,v.value,v.arr);}
}
export function captureM32Processing(nodes,base){return Object.fromEntries([...nodes].filter(([key])=>key.startsWith(base+'/')&&/^\/(?:eq(?:\/\d+)?|dyn(?:\/filter)?|gate(?:\/filter)?|delay|preamp)$/.test(key.slice(base.length))).map(([key,value])=>[key.slice(base.length),value]));}
export function applyM32Processing(nodes,base,bank,side=0){
 if(bank?.family!=='m32')return;const values=bank.sides?.[side]||bank.sides?.[0];for(const[path,value]of Object.entries(values||{}))if(/^\/(?:eq(?:\/\d+)?|dyn(?:\/filter)?|gate(?:\/filter)?|delay|preamp)$/.test(path)&&typeof value==='string'&&!/[\r\n]/.test(value)){
  // HPF remains an editable preparation field. Preserve trim/polarity only.
  if(path==='/preamp'){const old=value.split(' '),current=nodes.get(base+path)?.split(' ');if(current){current[0]=old[0];current[1]=old[1];nodes.set(base+path,current.join(' '));}}
  else nodes.set(base+path,value);
 }
}

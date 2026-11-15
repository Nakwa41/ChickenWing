// A configured WING insert remains connected while bypassed (on: false).
export function wingInsertSlot(insert){
 const match=typeof insert?.ins==='string'&&insert.ins.match(/^FX([1-9]|1[0-6])$/);
 return match?Number(match[1]):0;
}
export function wingInsertAssignments(ae){
 const result=[];
 for(const [group,target]of [['ch','CH'],['bus','BUS'],['main','MAIN'],['mtx','MTX']])for(const[n,strip]of Object.entries(ae?.[group]||{}))for(const position of ['preins','postins']){
  const insert=strip[position],slot=wingInsertSlot(insert),fx=ae.fx?.[slot];
  if(!slot||!fx?.mdl||fx.mdl==='NONE')continue;
  result.push({slot,model:fx.mdl,mix:fx.fxmix??100,usage:'insert',target,targetN:Number(n),position,bypass:!insert.on});
 }
 return result;
}
// WING's modelled channel EQs are processors too, even outside the FX rack.
export function wingChannelEqProcessors(s){
 const result=[];
 for(const[group,target]of [['ch','CH'],['bus','BUS'],['main','MAIN'],['mtx','MTX']])for(const[n,strip]of Object.entries(s.template?.ae_data?.[group]||{})){
  if(!strip.eq||(!strip.eq.on&&(!strip.eq.mdl||strip.eq.mdl==='STD')))continue;
  const record=target==='CH'?s.channels.find(c=>(c.referenceN||c.n)===Number(n)):s.outputs.concat(s.mixes||[]).find(m=>m.source===target&&(m.referenceN||m.bus)===Number(n));if(!record)continue;
  result.push({id:`wing-channel-eq-${target}-${n}`,slot:Number(n),model:strip.eq.mdl==='STD'?'WING_PEQ':strip.eq.mdl,rack:'channel',usage:'insert',target,targetN:record.n||record.bus,position:'preins',mix:strip.eq.mix??100,bypass:!strip.eq.on,origin:'channel-eq',sourceLabel:`EQ ${target} ${record.n||record.bus}`});
 }
 return result;
}

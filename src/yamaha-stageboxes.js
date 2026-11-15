// Physical analog ports, distinct from Dante Tx/Rx channels.
// Rio3224's final eight Dante receive channels feed AES outputs, not analog XLRs.
export const YAMAHA_STAGEBOXES=[
 {id:'rio3224d',name:'Rio3224-D',inputs:32,outputs:16,danteOut:24,rates:[48,96]},
 {id:'rio1608d',name:'Rio1608-D',inputs:16,outputs:8,danteOut:8,rates:[48,96]},
 {id:'rio3224d2',name:'Rio3224-D2',inputs:32,outputs:16,danteOut:24,rates:[48,96]},
 {id:'rio1608d2',name:'Rio1608-D2',inputs:16,outputs:8,danteOut:8,rates:[48,96]},
 {id:'rio3224d3',name:'Rio3224-D3',inputs:32,outputs:16,danteOut:24,rates:[48,96]},
 {id:'rio1608d3',name:'Rio1608-D3',inputs:16,outputs:8,danteOut:8,rates:[48,96]},
 {id:'tio1608d',name:'Tio1608-D',inputs:16,outputs:8,danteOut:8,rates:[48]},
 {id:'tio1608d2',name:'Tio1608-D2',inputs:16,outputs:8,danteOut:8,rates:[48,96]},
 {id:'ri8d',name:'Ri8-D',inputs:8,outputs:0,danteOut:0,rates:[48,96]},
 {id:'ro8d',name:'Ro8-D',inputs:0,outputs:8,danteOut:8,rates:[48,96]}
];
export const stageboxModel=id=>YAMAHA_STAGEBOXES.find(b=>b.id===id);
export const stageboxBank=b=>'SB:'+b.id;
export const stageboxForBank=(s,bank)=>(s?.stageboxes||[]).find(b=>stageboxBank(b)===bank);
export const unitLabel=n=>'Y'+Number(n).toString(16).toUpperCase().padStart(3,'0');
export function resolveYamahaPort(s,bank,port,output=false){const box=stageboxForBank(s,bank);return box?{bank:'DANTE',port:(output?box.outputStart:box.inputStart)+port-1,stagebox:box,physicalPort:port}: {bank,port};}
export function flattenYamahaPatch(s){return {...s,channels:s.channels.map(c=>{const r=resolveYamahaPort(s,c.bank,c.input);return {...c,bank:r.bank,input:r.port,...(r.stagebox?{stagebox:r.stagebox.id,stageboxPort:c.input,preparedGain:c.gain,preparedPhantom:c.phantom,gain:0,phantom:false}: {})};}),outputs:s.outputs.map(o=>{const r=resolveYamahaPort(s,o.bank,o.port,true);return {...o,bank:r.bank,port:r.port};})};}
export function validateStageboxes(s,danteCapacity){
 const issues=[],add=(text,level='error')=>issues.push({level,text,tab:'inputs'}),ids=new Set(),units=new Set(),ins=new Set(),outs=new Set(),rate=s.sampleRate||48;
 if(![48,96].includes(rate)||!s.model.startsWith('dm')&&rate!==48)add('Cette console Yamaha doit fonctionner à 48 kHz.');
 for(const b of s.stageboxes||[]){const m=stageboxModel(b.model);if(!m){add('Modèle de stagebox Yamaha inconnu.');continue;}if(ids.has(b.id))add('Identifiant de stagebox dupliqué.');ids.add(b.id);if(!Number.isInteger(b.unitId)||b.unitId<1||b.unitId>255||units.has(b.unitId))add(`${b.name} : Unit ID invalide ou dupliqué.`);units.add(b.unitId);if(!m.rates.includes(rate))add(`${m.name} ne prend pas en charge ${rate} kHz ; choisissez 48 kHz pour ce réseau.`);
  for(const [count,start,max,used,label]of [[b.inputCount,b.inputStart,m.inputs,ins,'entrée'],[b.outputCount,b.outputStart,m.outputs,outs,'sortie']]){if(!Number.isInteger(count)||count<0||count>max||!Number.isInteger(start)||start<1||count&&start+count-1>danteCapacity)add(`${b.name} : plage Dante ${label} hors capacité.`);for(let n=start;n<start+count;n++){if(used.has(n))add(`Deux stageboxes occupent Dante ${label} ${n}.`);used.add(n);}}
 }
 if(!['manual','console','auto'].includes(s.danteMode||'manual')||s.danteMode==='auto'&&s.model!=='dm3')add('Mode de mise en place Dante incompatible avec cette console.');
 if(s.model==='dm3s'&&(s.stageboxes||[]).length)add('La DM3 Standard ne possède pas de port Dante.');
 if(s.danteMode==='auto'&&s.model==='dm3'){const boxes=s.stageboxes||[],b=boxes[0];if(boxes.length!==1||b.unitId!==1||b.inputStart!==1||b.outputStart!==1||b.inputCount>16||b.outputCount>8||['ri8d','ro8d'].includes(b.model))add('Auto Setup DM3 : une Rio/Tio Y001, entrées Dante 1–16 et sorties 1–8 au maximum.');}
 const max=s.model.startsWith('dm')?24:8;if((s.stageboxes||[]).length>max)add(`Cette console accepte au maximum ${max} racks montés.`);
 if((s.stageboxes||[]).length)add(s.model.startsWith('dm')?'Les préamplis sont préparés dans le fichier DM. Vérifiez le montage et les abonnements Dante sur place selon le plan CSV.':'QL/CL : montez les racks puis appliquez les abonnements Dante, gains et 48 V selon le plan CSV. L’éditeur hors ligne prépare le patch interne.', 'warning');
 return issues;
}
export function yamahaConnectionPlan(s){
 const rows=[['Sens','Stagebox','Modèle','Unit ID','Port physique','Dante console','Voie / bus','Source','Gain prévu dB','48 V prévu','Fréquence kHz','Mode Dante']];
 for(const c of s.channels){const b=stageboxForBank(s,c.bank);if(!b)continue;for(let side=0;side<(c.mode==='ST'?2:1);side++)rows.push(['Entrée',b.name,stageboxModel(b.model).name,unitLabel(b.unitId),c.input+side,b.inputStart+c.input-1+side,`CH ${c.n+side}`,c.name,c.gain,c.phantom?'ON':'OFF',s.sampleRate||48,s.danteMode||'manual']);}
 for(const o of s.outputs){const b=stageboxForBank(s,o.bank);if(!b)continue;for(let side=0;side<(o.mode==='ST'?2:1);side++)rows.push(['Sortie',b.name,stageboxModel(b.model).name,unitLabel(b.unitId),o.port+side,b.outputStart+o.port-1+side,`${o.source} ${o.bus+(o.source==='MAIN'?0:side)}${o.mode==='ST'?side?' R':' L':''}`,o.name,'','',s.sampleRate||48,s.danteMode||'manual']);}
 return '\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
}

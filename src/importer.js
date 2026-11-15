import {channel,uid,BANKS} from './core.js';
import {resolveMic,applyMicrophone} from './microphones.js';
import {riderHeading,nonAudioEvidence,audioSourceEvidence,inlinePatchHeader,inlinePatchEntries,collectAudioContext} from './rider-context.js';
export {readRider,readRiderDocument} from './rider-reader.js';

const clean=s=>String(s??'').trim();
const normalize=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const IMPORT_COLUMNS={n:'N° de voie / bus',name:'Source / instrument',mic:'Micro / DI',mode:'Mono / stéréo',bank:'Interface',input:'Entrée physique',phantom:'48 V',gain:'Gain',port:'Sortie physique',notes:'Notes / pied',insert:'Insert demandé'};
const headers={
 n:/^(ch(?:\.)?|channel|canal|voie|number|num[ée]ro|n(?:[°º]|o\.?)?|num\.?|#|numero|numero de voie|input #|input ch|input channel|channel number|channel #|ch n[°o])$/,
 name:/^(source|instrument(?:s)?|nom|name|label|designation|description|channel name|input name|signal)$/,
 mic:/^(mic(?:s)?|micro(?:s)?|microphone(?:s)?|di|mic(?:ro)?\s*\/\s*di|microphone\s*\/\s*di|mic model|microphone model|reference|micro demande)$/,
 bank:/^(banque|bank|port source|interface|stagebox)$/,
 input:/^(entree|input|patch|input number|physical input|entree physique)$/,
 mode:/^(mode|format|mono.?stereo|type source)$/,
 phantom:/^(\+?48\s*v|phantom|phantom power|alimentation|p48)$/,
 bus:/^(bus|aux|mix|bus number|aux number)$/,
 port:/^(sortie|output|port|destination|output patch|sortie physique)$/,
 gain:/^gain(?:\s*\(db\))?$/,
 insert:/^(insert|inserts|processing|traitement|traitements)$/ ,
 notes:/^(notes?|commentaires?|comments?|remarques?|pied|stand|mic stand|accessoires?)$/
};
function headerMap(row){
 const map={};row.forEach((v,i)=>{for(const [key,re] of Object.entries(headers))if(re.test(normalize(v)))map[key]=i;});
 // "Input / Instrument / Mic" is a channel list; CH + Input has a physical input column.
 if(map.n===undefined&&map.input!==undefined){map.n=map.input;delete map.input;}
 return map;
}
export function splitTable(text) {
 text=String(text??'').replace(/^\uFEFF/,'');
 const lines=text.split(/\r?\n/);
 // Prefer the delimiter supported by the most lines, so a comma in a title cannot hide a table.
 const scores=['\t',';','|',','].map(d=>[d,lines.reduce((n,l)=>n+(l.includes(d)?1:0),0)]).sort((a,b)=>b[1]-a[1]);
 const delimiter=scores[0][1]?scores[0][0]:null;
 if(!delimiter)return lines.filter(l=>l.trim()).map(l=>l.trim().split(/\s{2,}/));
 const rows=[];let row=[],cell='',quote=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'&&(quote||!cell.trim())){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}
  else if(c===delimiter&&!quote){row.push(cell.trim());cell='';}
  else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
export function guessCategory(name) {
 const n=normalize(name);
 if(/kick|snare|caisse|tom|overhead|hi.?hat|charley|drum|\boh\b|batterie|cymbal|floor|\b(bd|sn|fl|hh)\b/.test(n))return 'Batterie';
 if(/bass|basse/.test(n))return 'Basse';if(/guit|acoust|electric|\bgtr\b/.test(n))return 'Guitares';
 if(/keys|clavier|synth|piano|track|playback|sequence/.test(n))return 'Claviers';
 if(/vocal|voix|chant|backing|lead vox|chor|\bvoc\b/.test(n))return 'Voix';return 'Autres';
}
export function detectColumns(rows){
 for(let i=0;i<Math.min(rows.length,80);i++){
  const map=headerMap(rows[i]);
  if(map.name!==undefined&&(map.n!==undefined||map.mic!==undefined||map.bus!==undefined||map.port!==undefined)){
   const kind=map.bus!==undefined||map.port!==undefined&&map.n===undefined?'outputs':'inputs';
   if(map.bus!==undefined){map.n=map.bus;delete map.bus;}return {mapping:map,startRow:i+1,kind,header:rows[i]};
  }
 }
 return {mapping:null,startRow:0,kind:'inputs',header:[]};
}
export function parseBank(value){
 const n=normalize(value).replace(/[^a-z0-9]/g,'');
 return Object.keys(BANKS).find(k=>[normalize(k),normalize(BANKS[k]).replace(/[^a-z0-9]/g,'')].includes(n))||({local:'LCL',card:'USB',cardusb:'USB',aes50a:'A',aes50b:'B',aes50c:'C',console:'LCL',regie:'LCL',rio:'A',stagebox:'A'}[n])||null;
}
function address(value){
 const v=clean(value),m=v.match(/^(.+?)\s*[.:\- ]\s*(\d+)(?:\s*[-–/]\s*\d+)?$/)||v.match(/^([ABC])\s*(\d+)$/i);
 return m?{bank:parseBank(m[1]),port:Number(m[2])}:{bank:null,port:/^\d+$/.test(v)?Number(v):null};
}
export function setImportedMic(c,value,phantom='',custom=[]){
 c.mic=clean(value);delete c.micId;delete c.micProfile;delete c.phantomMode;delete c.powerChoice;c.phantom=false;
 const m=resolveMic(c.mic,custom);
 if(m){try{applyMicrophone({channels:[c]},c,m);}catch{/* Unverified local references stay manual. */}}
 const p=normalize(phantom);if(p){c.phantom=/^(oui|yes|true|on|1|\+|\+?48\s*v|p48|x)$/.test(p);c.phantomMode='manual';}
 return c;
}
function splitNumberedLine(line){
 const m=line.match(/^\s*((?:(?:CH|BUS|AUX|MIX)\s*)?\d{1,3}(?:\s*[-–/]\s*\d{1,3})?)\s*[.):]?\s+(.+)$/i);
 if(!m)return [line];
 const parts=m[2].split(/\s{2,}|\s*\|\s*/);if(parts.length>1)return [m[1],...parts];
 // OCR often loses table spacing. Only split off an exactly recognized mic suffix.
 const words=m[2].split(/\s+/);
 for(let i=1;i<words.length;i++)if(resolveMic(words.slice(i).join(' ')))return [m[1],words.slice(0,i).join(' '),words.slice(i).join(' ')];
 return [m[1],m[2]];
}
function micInLabel(value,custom=[]){
 const words=clean(value).split(/\s+/);
 for(let size=Math.min(words.length,6);size>0;size--)for(let start=0;start+size<=words.length;start++){
  const model=resolveMic(words.slice(start,start+size).join(' '),custom);if(model)return model;
 }
 return null;
}
function describePatchMic(c,context,custom){
 const direct=micInLabel(c.name,custom);
 if(direct){setImportedMic(c,`${direct.brand} ${direct.model}`,'',custom);c.importMeta.micEvidence=`Nom du patch : ${c.name}`;return;}
 let candidates=[];
 if(/^dpa\s*\d*$/i.test(c.name))candidates=(context?.inventory||[]).filter(i=>/^DPA\s+\S+/i.test(i.label));
 else if(/^(?:micro\s*)?main\s+\d+$/i.test(c.name))candidates=(context?.inventory||[]).filter(i=>/micro\s+main|handheld/i.test(i.label));
 else if(/^(tb|talkback)$/i.test(c.name))candidates=(context?.inventory||[]).filter(i=>/\b(tb|talkback)\b/i.test(i.label));
 const unique=[...new Map(candidates.map(i=>[normalize(i.label),i])).values()];
 if(unique.length===1){
  const item=unique[0],known=micInLabel(item.label,custom);
  setImportedMic(c,known?`${known.brand} ${known.model}`:item.label,'',custom);
  c.importMeta.micEvidence=`${item.section} : ${item.evidence}`;
  c.importMeta.notes=[c.importMeta.notes,`Référence issue de l’inventaire son : ${item.evidence}`].filter(Boolean).join(' · ');
 }
}
export function parseRider(text,options={}) {
 const rows=options.rows||splitTable(text),channels=[],outputs=[],unparsed=[],warnings=[],audioLines=[];
 const state=options.state||{},manual=!!options.mapping;
 let map=options.mapping||state.mapping||null,kind=options.kind||state.kind||'inputs';
 let scope=state.scope||'unknown',trusted=manual||state.trusted||false,inline=state.inline||null;
 let nextNumber=state.nextNumber||1,nextPort=state.nextPort||1,nextInput=state.nextInput||1,nextOutput=state.nextOutput||1,ignoredCount=0;
 const retain=line=>audioLines.push(line);
 for(let index=options.startRow||0;index<rows.length;index++){
  let row=rows[index].map(clean);if(!row.some(Boolean))continue;
  const joined=row.join(' '),norm=normalize(joined),h=headerMap(row);
  const heading=riderHeading(joined);
  if(!manual&&heading){scope=heading;map=null;inline=null;trusted=false;if(scope==='audio')retain(joined);else ignoredCount++;continue;}
  const inlineHeader=!manual&&scope!=='other'&&inlinePatchHeader(joined);
  if(inlineHeader){scope='audio';inline=inlineHeader;map=null;trusted=true;kind=inline.kind;}
  if(!manual&&scope==='other'){ignoredCount++;continue;}
  // Quantities are equipment, including in the audio inventory. They are never channel numbers.
  if(!manual&&/^\s*\d+\s*(?:x\b|×)/i.test(joined)){if(scope==='audio'){retain(joined);unparsed.push(joined);}else ignoredCount++;continue;}
  const entries=inline?inlinePatchEntries(inlineHeader?inlineHeader.body:joined,inline.kind):[];
  if(inlineHeader||entries.length){
   retain(joined);
   for(const entry of entries){
    const bank=inline.role==='local'?'LCL':'A';
    const meta={line:index+1,original:`${inline.device} ${inline.kind==='inputs'?'IN':'OUT'} ${entry.port} : ${entry.name}`,bankExplicit:inline.role==='local',portExplicit:true,logicalExplicit:false,sourceDevice:inline.device,sourceRole:inline.role,documentPort:entry.port,phantom:'',modeExplicit:false,notes:'',evidence:`Patch ${inline.device} ${inline.kind==='inputs'?'IN':'OUT'}`};
    if(inline.kind==='inputs'){
     const c=channel(nextInput++,{name:entry.name,bank,input:entry.port,category:guessCategory(entry.name),reviewed:false,importMeta:meta});
     describePatchMic(c,options.context,options.customMics);c.spare=/\b(spare|backup|secours)\b/i.test(c.name);channels.push(c);
    }else outputs.push({id:uid(),bus:nextOutput++,name:entry.name,source:'BUS',type:/iem|ear/i.test(entry.name)?'IEM':/rec/i.test(entry.name)?'Autre':'Wedge',mode:'M',bank,port:entry.port,tap:'PRE',mute:true,fader:-144,reviewed:false,importMeta:meta});
   }
   continue;
  }
  if(!manual&&nonAudioEvidence(joined)&&!micInLabel(map?.mic!==undefined?row[map.mic]:'',options.customMics)){map=null;inline=null;trusted=false;ignoredCount++;continue;}
  if(inline)trusted=false;
  if(!manual&&h.name!==undefined&&(h.n!==undefined||h.mic!==undefined||h.bus!==undefined||h.port!==undefined)){
   map=h;kind=h.bus!==undefined||h.port!==undefined&&h.n===undefined?'outputs':'inputs';if(h.bus!==undefined){map.n=h.bus;delete map.bus;}
   trusted=h.mic!==undefined||h.phantom!==undefined||kind==='outputs'||scope==='audio';inline=null;retain(row.join('\t'));continue;
  }
  if(!manual&&/^(patch\s*(?:d['’]\s*)?)?(sorties|outputs|output list|monitors|retours)\b/.test(norm)){scope='audio';kind='outputs';map=null;inline=null;trusted=true;retain(joined);continue;}
  if(!manual&&/^(patch\s*(?:d['’]\s*)?)?(entrees|inputs|input list|channels)\b/.test(norm)){scope='audio';kind='inputs';map=null;inline=null;trusted=true;retain(joined);continue;}
  if(h.name!==undefined&&(h.n!==undefined||h.mic!==undefined||h.bus!==undefined))continue;
  if(!map&&row.length===1)row=splitNumberedLine(joined);
  const get=k=>map?.[k]!==undefined&&map[k]!==''?clean(row[map[k]]):'';
  const nText=map?(map.n!==undefined?get('n'):String(nextNumber)):row[0];
  const numberMatch=clean(nText).match(/^(?:(?:CH|BUS|AUX|MIX)\s*)?(\d{1,3})(?:\s*[-–/]\s*(\d{1,3}))?[.)]?$/i);
  const name=map?get('name'):row[1],mic=map?get('mic'):row[2]||'';
  const audioEvidence=audioSourceEvidence(name)||!!micInLabel(mic,options.customMics);
  if(!manual&&(!trusted&&!audioEvidence||map&&map.n===undefined&&row.filter(Boolean).length<2)){
   if(scope==='audio'||map){retain(joined);unparsed.push(joined);}else ignoredCount++;continue;
  }
  if(!numberMatch||!Number(numberMatch[1])||!name){if(scope==='audio'||map||manual){retain(joined);unparsed.push(joined);}else ignoredCount++;continue;}
  const number=Number(numberMatch[1]);
  if(numberMatch[2]&&Number(numberMatch[2])!==number+1){retain(joined);unparsed.push(joined);warnings.push(`Ligne ${index+1} : la plage ${nText} doit être détaillée voie par voie.`);continue;}
  retain(row.join('\t'));
  const modeText=normalize(get('mode')),mode=/m\s*\/\s*s|mid.?side/.test(modeText)?'M/S':/stereo|\bst\b|l\s*\/\s*r|2ch/.test(modeText)||numberMatch[2]?'ST':'M';
  const bankValue=get('bank'),physical=address(get(kind==='outputs'?'port':'input'));
  const device=/^(rio(?:[- ]?\d+(?:-d)?)?|stagebox)$/i.test(bankValue)?bankValue:'';
  const bank=parseBank(bankValue)||physical.bank||'A';
  const meta={line:index+1,original:joined,bankExplicit:!!(bankValue||physical.bank)&&!device,portExplicit:physical.port!==null,logicalExplicit:true,phantom:get('phantom'),modeExplicit:!!(modeText||numberMatch[2]),notes:[get('notes'),get('insert')?`Insert demandé : ${get('insert')}`:''].filter(Boolean).join(' · '),insert:get('insert'),...(device?{sourceDevice:device,sourceRole:'stagebox'}:{})};
  if(bankValue&&!parseBank(bankValue)&&!device)warnings.push(`Ligne ${index+1} : interface « ${bankValue} » inconnue, AES50 A proposé.`);
  if(modeText&&!/^(m|mono|st|stereo|m\s*\/\s*s|mid.?side|l\s*\/\s*r|2ch)$/.test(modeText))warnings.push(`Ligne ${index+1} : format « ${get('mode')} » à vérifier.`);
  if(meta.phantom&&!/^(oui|non|yes|no|true|false|on|off|0|1|\+|-|\+?48\s*v|p48|x)$/.test(normalize(meta.phantom)))warnings.push(`Ligne ${index+1} : alimentation « ${meta.phantom} » non comprise, 48 V désactivé.`);
  if(kind==='outputs'){
   const port=physical.port??nextPort;
   outputs.push({id:uid(),bus:number,name,source:'BUS',type:/iem|ear/i.test(name)?'IEM':/front/i.test(name)?'Front':'Wedge',mode,bank,port,tap:'PRE',mute:true,fader:-144,reviewed:false,importMeta:meta});nextPort=port+(mode==='M'?1:2);nextOutput=Math.max(nextOutput,number+1);
  }else{
   const gainText=get('gain'),gain=Number(gainText.replace(',','.').replace(/\s*db$/i,''));
   const c=channel(number,{name,mic,category:guessCategory(name),bank,input:physical.port??number,mode,gain:gainText?gain:0,reviewed:false,importMeta:meta});
   setImportedMic(c,c.mic,meta.phantom,options.customMics);c.spare=/\b(spare|backup|secours)\b/i.test(c.name);channels.push(c);nextInput=Math.max(nextInput,number+1);
  }
  nextNumber=number+1;
 }
 return {channels,outputs,unparsed,warnings,raw:String(text??''),audioRaw:audioLines.join('\n'),ignoredCount,state:{mapping:map,kind,nextNumber,nextPort,nextInput,nextOutput,scope,trusted,inline}};
}

// Analyze the whole rider for context, then import only pages/sheets with audio patch evidence.
export function parseRiderDocument(doc,{selectedIds,settings={},customMics=[]}={}){
 const context=collectAudioContext(doc.sections);let state;
 const analysis=doc.sections.map(section=>{
  const continued=section.id.startsWith('page-')&&state?.scope!=='other'?state:undefined;
  const parsed=parseRider(section.text,{state:continued,...settings[section.id],context,customMics});state=parsed.state;
  for(const row of [...parsed.channels,...parsed.outputs])Object.assign(row.importMeta,{sectionId:section.id,sectionLabel:section.label});
  return {...section,parsed,inputCount:parsed.channels.length,outputCount:parsed.outputs.length};
 });
 const candidates=analysis.filter(s=>s.inputCount||s.outputCount);
 const defaults=doc.sections[0]?.id.startsWith('sheet-')?candidates.slice(0,1):candidates;
 const selected=new Set(selectedIds??defaults.map(s=>s.id));
 const parts=analysis.filter(s=>selected.has(s.id)),channels=parts.flatMap(s=>s.parsed.channels),outputs=parts.flatMap(s=>s.parsed.outputs),warnings=[...(doc.warnings||[]),...parts.flatMap(s=>s.parsed.warnings)];
 if(outputs.some(o=>o.importMeta.logicalExplicit===false))warnings.push('Les OUT de la fiche sont des ports physiques. Les BUS sont proposés ; les envois et les sources d’enregistrement restent à préparer.');
 const baseWarnings=[...warnings];warnings.push(...inventoryWarnings(context,channels));
 return {filename:doc.filename,channels,outputs,unparsed:parts.flatMap(s=>s.parsed.unparsed),warnings,baseWarnings,raw:parts.map(s=>s.parsed.audioRaw).filter(Boolean).join('\n'),selectedSections:parts.map(s=>s.label),context,analysis,selectedIds:[...selected]};
}

export function inventoryWarnings(context,channels){
 const warnings=[];
 for(const item of context?.inventory||[]){
  const affected=channels.filter(c=>c.include!==false&&!c.spare&&c.importMeta.micEvidence===`${item.section} : ${item.evidence}`);
  if(affected.length>item.quantity)warnings.push(`${item.label} : ${affected.length} entrées actives au patch pour ${item.quantity} référence(s) dans l’inventaire son. Attribution à confirmer.`);
 }
 return warnings;
}

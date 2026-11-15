// Local evidence from headings and explicit audio patch labels. No network or model inference.
export const normalizeRider=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
export function riderHeading(value){
 const n=normalizeRider(value).replace(/[:.!]+$/,'').trim(),letters=n.replace(/[^a-z]/g,'');
 const repeated=(word)=>letters===word||letters===word+word||letters===word.split('').map(c=>c+c).join('');
 if(['son','audio','sound','sonorisation','regieson'].some(repeated))return 'audio';
 if(['lumiere','eclairage','lighting','interphonie','intercom','logistique','loges','plateau','captation','clausescontractuelles'].some(repeated))return 'other';
 if(/^(?:patch (?:son|audio)|audio patch)$/.test(n))return 'audio';
 if(/^backline(?:\s*[:/–-].*)?$/.test(n))return 'other';
 // Some PDF text layers duplicate every glyph in large section titles.
 if(['son','ssoonn','audio','sound','sonorisation','regieson','soundrequirements'].includes(letters))return 'audio';
 if(/^(?:patch\s+)?(?:lumiere|eclairage|lighting|light plot|plan de feu|lx\s*\d*|logistique|logistics|contacts?|regisseur general|plateau|stage requirements|stage plot|plan de scene|video|interphonie|intercom|captation|loges|clauses contractuelles|liste (?:complete )?(?:du )?materiel)\b/.test(n)||['lluum miieerree'.replace(/ /g,''),'lluumieireere','lluumiieree'].includes(letters)||/^l+u+m+[iie]+[re]+$/.test(letters))return 'other';
 if(/^(?:son|audio|sound)\s*[:\-]/.test(n))return 'audio';
 return null;
}
export const nonAudioEvidence=value=>/\b(?:grand\s*ma\s*[23]?|wash|beam|spot|projecteurs?|lumiere|lighting|dimmer|dmx|sunstrip|decoupe|cycliode|ventilateurs?|brouillard|regisseur|regisseuse|pupitreur|telephone|contacts?|logistique|hotel|chambres?|catering|intercom)\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|https?:\/\//i.test(normalizeRider(value));
export const audioSourceEvidence=value=>/\b(?:kick|snare|tom|overheads?|hi.?hat|charley|batterie|cymbal|bass|basse|guitare?s?|guitar|keys|clavier|piano|synth|tracks?|playback|vocal|voix|chant|vox|talkback|tb|ordi|spare|dpa|iem|wedge|retour|side|front|rec(?:ording)?|ears?|micro|mic|di|bd|sn|fl|hh|gtr|voc)\b/i.test(normalizeRider(value));
export function inlinePatchHeader(value){
 const text=String(value).trim();
 const devices='(?:RIO(?:[- ]?\\d+(?:-D\\d?)?)?|stage\\s*box(?:\\s+\\w+)?|console|local|AES50\\s*[ABC])';
 const direction='(?:IN(?:PUTS?)?|OUT(?:PUTS?)?|ENTR[ÉE]ES?|SORTIES?)';
 const match=text.match(new RegExp(`^(?:patch\\s+(?:d['’]\\s*)?)?(${devices})\\s+(${direction})\\s*[:：]\\s*(.*)$`,'i'))||text.match(new RegExp(`^patch\\s+(${direction})\\s+(${devices})\\s*[:：]\\s*(.*)$`,'i'));
 if(!match)return null;
 const inverted=new RegExp(`^${direction}$`,'i').test(match[1]),device=(inverted?match[2]:match[1]).replace(/\s+/g,' ').trim();
 return {device,role:/^(console|local)$/i.test(device)?'local':'stagebox',kind:/^(out|sort)/i.test(inverted?match[1]:match[2])?'outputs':'inputs',body:match[3]};
}
export function inlinePatchEntries(value,kind){
 const re=kind==='outputs'?/\b(?:Out(?:put)?|Sortie)\s*(\d{1,3})\s*[:：=.]\s*/gi:/\b(?:In(?:put)?|Entr[ée]e)\s*(\d{1,3})\s*[:：=.]\s*/gi;
 const matches=[...String(value).matchAll(re)];
 return matches.map((m,i)=>({port:Number(m[1]),name:String(value).slice(m.index+m[0].length,matches[i+1]?.index).replace(/\s*[/;|]+\s*$/,'').trim()})).filter(x=>x.port>0&&x.name);
}
export function collectAudioContext(sections){
 const inventory=[],stageboxes=[],consoles=[];let scope='unknown';
 for(const section of sections){
  if(scope==='other')scope='unknown';
  for(const raw of section.text.split(/\r?\n/)){
   const line=raw.replace(/\t+/g,' ').replace(/\s+/g,' ').trim(),heading=riderHeading(line);
   if(heading)scope=heading;
   const patch=scope!=='other'&&inlinePatchHeader(line);if(patch){scope='audio';if(patch.role==='stagebox'&&!stageboxes.includes(patch.device))stageboxes.push(patch.device);continue;}
   if(scope!=='audio'||nonAudioEvidence(line))continue;
   const item=line.match(/^\s*\d+\s*[x×]\s*(.+)$/i);
   if(!item)continue;
   const label=item[1].trim(),entry={label,quantity:Number(line.match(/^\s*(\d+)/)[1]),section:section.label,evidence:line};inventory.push(entry);
   if(/^console\b/i.test(label))consoles.push(entry);
  }
 }
 return {inventory,stageboxes,consoles};
}

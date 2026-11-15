import {channel,BANKS} from './core.js';
import {consolePicker} from './console-picker.js';
import {CONSOLES,bankOptions,isM32,pairedStereo,defaultBank,isYamaha} from './consoles.js';
import {MICROPHONES,resolveMic} from './microphones.js';
import {parseRiderDocument,inventoryWarnings,splitTable,detectColumns,IMPORT_COLUMNS,setImportedMic} from './importer.js';
import {planRiderImport} from './import-plan.js';

export function createImportUI({show,frame,btn,esc,icon,openModal,renderModal,toast,commit,getCustom}){
 let doc,result,selected,settings,editing,options;
 const $=s=>document.querySelector(s);
 function begin(identity={}){
  doc=result=null;settings={};selected=new Set();editing='';
  options={target:'new',name:identity.name||'',model:identity.model||show().model,artist:identity.artist||'',date:identity.date||'',venue:identity.venue||'',bank:identity.bank||defaultBank(identity.model||show().model),outBank:defaultBank(identity.model||show().model),stageboxes:structuredClone(identity.stageboxes||[]),free:false};
 }
 function parse(){
  result=parseRiderDocument(doc,{selectedIds:[...selected],settings,customMics:getCustom()});
 }
 function load(document){
  if(!options)begin();
  doc=document;settings={};result=parseRiderDocument(doc,{customMics:getCustom()});
  selected=new Set(result.selectedIds);editing=[...selected][0]||doc.sections[0]?.id;
  if(!options.name)options.name=(doc.filename||'Show importé').replace(/\.[^.]+$/,'');
  openModal('import-preview');
 }
 const field=(label,key,value,type='text',attrs='')=>`<label class="field"><span>${label}</span><input data-import-option="${key}" value="${esc(value)}" type="${type}" ${attrs}></label>`;
 const select=(label,key,value,choices,attr='data-import-option')=>`<label class="field"><span>${label}</span><select ${attr}="${key}">${choices.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
 function view(){
  const p=planRiderImport(show(),result,options),model=options.target==='append'?show().model:options.model,ioShow=options.target==='append'?show():{model,stageboxes:options.stageboxes||[]};
  const section=doc.sections.find(s=>s.id===editing),rows=splitTable(section?.text||''),detected=detectColumns(rows),config=settings[editing];
  const map=config?.mapping||detected.mapping||{},start=config?.startRow??detected.startRow;
  const samples=rows[start]||rows[0]||[];
  const choices=[['','Ignorer'],...Array.from({length:Math.max(...rows.slice(0,100).map(r=>r.length),1)},(_,i)=>[i,`${i+1} · ${(detected.header[i]||samples[i]||'Colonne').slice(0,28)}`])];
  const rowField=(c,key,value,type='text',attrs='')=>`<input data-import-row="${c.id}" data-key="${key}" aria-label="${esc(IMPORT_COLUMNS[key]||key)} · ${esc(c.name)}" value="${esc(value)}" type="${type}" ${attrs}>`;
  const rowSelect=(c,key,value,choices)=>`<select data-import-row="${c.id}" data-key="${key}" aria-label="${esc(IMPORT_COLUMNS[key]||key)} · ${esc(c.name)}">${choices.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  const table=(records,output=false)=>!records.length?'':`<h3 class="import-section-title">${output?'Sorties':'Entrées'} · valeurs du document</h3><div class="import-preview-table"><table class="patch-table import-edit-table"><thead><tr><th>Inclure</th><th>${output?'BUS':'CH'}${records.some(c=>c.importMeta?.logicalExplicit===false)?' PROPOSÉ':''}</th><th>SOURCE / NOM</th><th>${output?'TYPE':'MICRO / DI'}</th><th>MODE</th><th>INTERFACE</th><th>${output?'SORTIE':'ENTRÉE'}</th>${output?'':'<th>48 V</th><th>GAIN</th>'}</tr></thead><tbody>${records.map(c=>{
   const mic=resolveMic(c.mic,getCustom()),applied=p.show.channels.find(x=>x.id===c.id)||c;return `<tr class="${c.include===false?'import-excluded':''}"><td><input type="checkbox" data-import-row="${c.id}" data-key="include" ${c.include===false?'':'checked'} aria-label="Inclure ${esc(c.name)}"></td><td>${rowField(c,output?'bus':'n',output?c.bus:c.n,'number','min="1" class="import-number"')}</td><td>${rowField(c,'name',c.name,'text','class="import-name"')}<small>${esc([c.importMeta?.sectionLabel,c.importMeta?.sourceDevice?`${c.importMeta.sourceDevice} ${output?'OUT':'IN'} ${c.importMeta.documentPort}`:'',c.importMeta?.notes].filter(Boolean).join(' · '))}</small>${output?'':`<label class="import-spare"><input type="checkbox" data-import-row="${c.id}" data-key="spare" ${c.spare?'checked':''} aria-label="Spare · ${esc(c.name)}">Spare / secours</label>`}</td><td>${output?esc(c.type):rowField(c,'mic',c.mic,'text','list="import-mics" class="import-mic"')}${output?'':`<small class="${mic?'green':'amber'}">${!c.mic?'Non précisé':c.importMeta?.micEvidence?.startsWith('Nom du patch')?'Modèle dans le patch':c.importMeta?.micEvidence?'Proposé d’après l’inventaire son':mic?'Référence reconnue':'Référence libre · à vérifier'}</small>`}</td><td>${rowSelect(c,'mode',c.mode,[['M','Mono'],['ST','Stéréo'],...(!output&&!pairedStereo(model)?[['M/S','M/S']]:c.mode==='M/S'?[['M/S','M/S · à corriger']]:[])])}</td><td>${rowSelect(c,'bank',c.bank,[[c.bank,BANKS[c.bank]||c.bank],...bankOptions(ioShow,output).filter(([k])=>k!==c.bank)])}</td><td>${rowField(c,output?'port':'input',output?c.port:c.input,'number','min="1" class="import-number"')}<small>${c.importMeta?.portExplicit?'Fiche':'Auto'}</small></td>${output?'':`<td>${rowSelect(c,'phantom',c.importMeta?.phantom||'',[['','Auto / défaut'],['oui','ON'],['non','OFF'],...(!['','oui','non'].includes(c.importMeta?.phantom||'')?[[c.importMeta.phantom,c.importMeta.phantom]]:[])])}<small data-import-power="${c.id}" class="${applied.phantom?'amber':''}">${applied.phantom?'ON':'OFF'} · ${applied.phantomMode==='auto'?'auto':c.importMeta?.phantom?'manuel':'défaut'}</small></td><td>${rowField(c,'gain',c.gain,'number','step="0.5" class="import-number"')}</td>`}</tr>`;
  }).join('')}</tbody></table></div>`;
  return frame('Importer un patch',esc(doc.filename||'Texte collé')+' · lecture sur cet ordinateur',`
   <div class="import-summary"><span class="stat-icon green">${icon('file',23)}</span><div><h3>${result.channels.filter(c=>c.include!==false).length} voies · ${p.outputCount} sorties sélectionnées</h3><p>Seuls les patches audio identifiés sont retenus. Contacts, inventaires et lumière ne créent aucune voie.</p></div></div>
   ${!result.channels.length&&!result.outputs.length?'<div class="import-warnings">Aucun patch audio fiable détecté. Aucun inventaire ni liste de contacts n’a été converti en voies. Vous pouvez affecter les colonnes d’un tableau audio ci-dessous.</div>':''}
   ${result.context.consoles.length?`<div class="import-warnings">${icon('help',17)}<span>Console demandée : ${esc(result.context.consoles.map(c=>c.label.replace(/^Console\s+/i,'')).join(' / '))}. Le patch sera préparé pour ${esc(CONSOLES[model])}, sélectionné ci-dessous.</span></div>`:''}
   <div class="import-destination">${select('Destination','target',options.target,[['new','Créer un nouveau show'],['append',`Ajouter à ${show().name}`]])}${options.target==='new'?`${field('Nom du show','name',options.name)}${consolePicker(options.model,{esc,modelAttributes:'data-import-option="model"'})}<details class="raw-details"><summary>Artiste, date et lieu</summary><div class="two-fields">${field('Artiste','artist',options.artist)}${field('Date','date',options.date,'date')}</div>${field('Lieu','venue',options.venue)}</details>`:`<p class="form-hint">Console : ${esc(CONSOLES[model])}. Cet ajout pourra être annulé dans l’éditeur.</p>`}<div class="two-fields">${select(result.context.stageboxes.length?'Entrées stagebox '+result.context.stageboxes.join(' / ')+' → interface du show':'Interface des entrées sans indication','bank',options.bank,bankOptions(ioShow))}${select(result.context.stageboxes.length?'Sorties stagebox → interface du show':'Interface des sorties sans indication','outBank',options.outBank,bankOptions(ioShow,true))}</div>${result.context.stageboxes.length?'<p class="form-hint">RIO est identifié comme une stagebox ; Console correspond à Local. Les ports IN/OUT sont conservés. Choisissez l’interface correspondante de votre show ; cette correspondance ne configure pas la connexion du matériel.</p>':''}<label class="checkbox-row"><input type="checkbox" data-import-option="free" ${options.free?'checked':''}>Adapter les numéros et les ports aux places libres</label><p class="form-hint">${options.free?'Les numéros et adresses du document seront réaffectés. Les références de micros sont conservées.':'Les numéros et adresses explicites sont conservés. Les adresses absentes sont affectées aux ports libres, paires stéréo comprises.'}</p></div>
   ${doc.sections.length>1?`<div class="import-sections"><h3 class="import-section-title">${doc.sections[0].id.startsWith('sheet-')?'Feuilles à utiliser':'Pages à utiliser'}</h3><p class="form-hint">Seules les pages ou feuilles contenant un patch audio sont cochées. L’inventaire son sert aux références de micros, sans créer de voies. Changer cette sélection remplace les corrections de l’aperçu.</p>${result.analysis.map(s=>`<label class="${s.inputCount||s.outputCount?'audio-patch-page':''}"><input type="checkbox" data-import-section="${s.id}" ${selected.has(s.id)?'checked':''}>${esc(s.label)}<small>${s.inputCount||s.outputCount?`${s.inputCount} entrées · ${s.outputCount} sorties`:'Aucun patch audio'}</small>${s.method?`<small>${esc(s.method)}</small>`:''}</label>`).join('')}</div>`:''}
   <details class="raw-details"><summary>Régler la lecture des colonnes</summary><p class="form-hint">Pour un tableau inhabituel, affectez les colonnes ci-dessous. Une nouvelle lecture remplace les corrections de l’aperçu.</p>${doc.sections.length>1?select('Page / feuille à régler','editing',editing,doc.sections.map(s=>[s.id,s.label]),'data-import-control'):''}<div class="two-fields">${select('Tableau','kind',config?.kind||detected.kind,[['inputs','Entrées'],['outputs','Sorties']],'data-import-map')}<label class="field"><span>Première ligne de données (à partir de 1)</span><input type="number" id="import-start-row" min="1" value="${start+1}"></label></div><div class="import-column-grid">${Object.entries(IMPORT_COLUMNS).map(([key,label])=>select(label,key,map[key]??'',choices,'data-import-map')).join('')}</div>${btn('Appliquer cette lecture','import-map','route','small secondary')}${btn('Revenir à la détection automatique','import-map-reset','','small secondary')}</details>
   <div class="import-warnings">${icon('help',17)}Toutes les lignes importées restent à vérifier. Seule une référence exacte reconnue prépare son alimentation ; le 48 V explicite est prioritaire. Les références libres sont conservées.</div>
   <datalist id="import-mics">${[...MICROPHONES,...getCustom()].map(m=>`<option value="${esc(m.brand+' '+m.model)}"></option>`).join('')}</datalist>
   ${table(result.channels)}${table(result.outputs,true)}${btn('Ajouter une ligne d’entrée','import-add-row','plus','small secondary')}
   <div id="import-assignments">${p.changes.length?`<details class="raw-details import-assignments" open><summary>Affectations après import · ${p.profile.name}</summary><pre>${esc(p.changes.join('\n'))}</pre></details>`:''}</div>
   <div id="import-validation" aria-live="polite">${p.errors.length?`<div class="issue-list">${p.errors.map(text=>`<div class="issue error">${icon('help',16)}<span>${esc(text)}</span></div>`).join('')}</div>`:`<div class="check-success">${icon('check',16)}Aucun conflit détecté · ${p.channelCount} voie(s) console à importer.</div>`}</div>
   <div id="import-reading-warnings">${result.warnings.length?`<details class="raw-details" open><summary>${result.warnings.length} remarque(s) de lecture</summary><pre>${esc(result.warnings.join('\n'))}</pre></details>`:''}</div>
   ${result.unparsed.length?`<details class="raw-details"><summary>${result.unparsed.length} ligne(s) non interprétée(s), conservées dans le projet</summary><pre>${esc(result.unparsed.join('\n'))}</pre></details>`:''}
   <details class="raw-details"><summary>Texte du son retenu · consulter ou corriger</summary><p class="form-hint">Une nouvelle lecture remplace les corrections de l’aperçu.</p><textarea id="extracted-text" aria-label="Texte extrait" rows="8">${esc(result.raw)}</textarea>${btn('Relire le texte corrigé','import-reparse','route','small secondary')}</details>`,
   btn('Autre document','back-import','','secondary')+btn(options.target==='new'?'Créer le show':'Ajouter le patch','confirm-import','check','primary',p.errors.length?'disabled':''),true);
 }
 function refreshPlan(){
  const container=document.createElement('div');container.innerHTML=view();
  for(const selector of ['#import-validation','#import-assignments','.import-summary','#import-reading-warnings']){const old=$(selector),next=container.querySelector(selector);if(old&&next)old.replaceWith(next);}
  for(const el of document.querySelectorAll('[data-import-power]')){const next=container.querySelector(`[data-import-power="${el.dataset.importPower}"]`);if(next)el.replaceWith(next);}
  const button=$('[data-action="confirm-import"]');if(button)button.disabled=!!container.querySelector('[data-action="confirm-import"]:disabled');
 }
 function onChange(el){
  if(el.dataset.importOption){
   const key=el.dataset.importOption;options[key]=el.type==='checkbox'?el.checked:el.value;
   if(key==='target'){options.free=el.value==='append'&&![...result.channels,...result.outputs].some(c=>c.importMeta?.logicalExplicit===false);if(el.value==='append'){options.bank='A';options.outBank='A';}}
   if(key==='model'){options.stageboxes=[];if(!bankOptions(options.model).some(([k])=>k===options.bank))options.bank=defaultBank(options.model);if(!bankOptions(options.model,true).some(([k])=>k===options.outBank))options.outBank=defaultBank(options.model);}
   if(['name','artist','date','venue'].includes(key))refreshPlan();else renderModal();return true;
  }
  if(el.dataset.importSection){el.checked?selected.add(el.dataset.importSection):selected.delete(el.dataset.importSection);parse();renderModal();return true;}
  if(el.dataset.importControl){editing=el.value;renderModal();return true;}
  if(el.dataset.importRow){
   const c=[...result.channels,...result.outputs].find(c=>c.id===el.dataset.importRow),key=el.dataset.key;
   if(!c)return true;
   if(key==='include')c.include=el.checked;
   else if(key==='spare'){c.spare=el.checked;c.importMeta.spareEvidence='Choix dans l’aperçu';if(c.spare&&!/\b(spare|backup|secours)\b/i.test(c.name)){c.importMeta.spareName=c.name;c.name+=' · Spare';}else if(!c.spare&&c.importMeta.spareName){c.name=c.importMeta.spareName;delete c.importMeta.spareName;}const name=el.closest('tr').querySelector('[data-key="name"]');if(name)name.value=c.name;}
   else if(key==='mic'||key==='phantom'){if(key==='phantom')c.importMeta.phantom=el.value;else{delete c.importMeta.micEvidence;c.importMeta.notes=(c.importMeta.notes||'').split(' · ').filter(n=>!n.startsWith('Référence issue de l’inventaire son :')).join(' · ');}setImportedMic(c,key==='mic'?el.value:c.mic,c.importMeta.phantom,getCustom());}
   else {c[key]=el.type==='number'?Number(el.value):el.value;if(key==='name')delete c.importMeta.spareName;if(key==='bank')c.importMeta.bankExplicit=true;if(['input','port'].includes(key))c.importMeta.portExplicit=true;}
   result.warnings=[...(result.baseWarnings||[]),...inventoryWarnings(result.context,result.channels)];refreshPlan();
   if(key==='include')el.closest('tr').classList.toggle('import-excluded',!el.checked);
   if(key==='mic'){const status=el.parentElement.querySelector('small'),m=resolveMic(c.mic,getCustom());if(status){status.className=m?'green':'amber';status.textContent=!c.mic?'À compléter':m?'Référence reconnue':'Référence libre · à vérifier';}}
   return true;
  }
  return !!el.dataset.importMap;
 }
 function onClick(action){
  if(action==='import-map'){
   const mapping={},kind=$('[data-import-map="kind"]').value;for(const el of document.querySelectorAll('[data-import-map]'))if(el.dataset.importMap!=='kind'&&el.value!=='')mapping[el.dataset.importMap]=Number(el.value);
   if(mapping.name===undefined){toast('Affectez une colonne Source / instrument.','error');return true;}
   const values=Object.values(mapping);if(new Set(values).size!==values.length){toast('Une colonne ne peut servir qu’à un seul champ.','error');return true;}
   const startRow=Number($('#import-start-row').value)-1;if(!Number.isInteger(startRow)||startRow<0){toast('Choisissez une première ligne valide.','error');return true;}
   settings[editing]={mapping,kind,startRow};selected.add(editing);parse();renderModal();return true;
  }
  if(action==='import-map-reset'){delete settings[editing];parse();renderModal();return true;}
  if(action==='import-add-row'){result.channels.push(channel(Math.max(0,...result.channels.map(c=>c.n))+1,{name:'Nouvelle source',reviewed:false,importMeta:{bankExplicit:false,portExplicit:false,phantom:'',notes:''}}));renderModal();return true;}
  if(action==='import-reparse'){
   const text=$('#extracted-text').value;doc={...doc,sections:[{id:'edited',label:'Texte corrigé',text}]};selected=new Set(['edited']);editing='edited';settings={};parse();renderModal();return true;
  }
  if(action==='confirm-import'){
   const p=planRiderImport(show(),result,options);if(p.errors.length){toast(p.errors[0],'error');renderModal();return true;}
   commit(p.show,options.target==='append');return true;
  }
  return false;
 }
 return {begin,load,view,onChange,onClick};
}

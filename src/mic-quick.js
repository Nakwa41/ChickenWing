import {searchMicrophones,applyMicrophone,POWER,TYPES,PATTERNS} from './microphones.js';

export function createMicQuick(ctx){
 const {esc,icon}=ctx,$=s=>document.querySelector(s);
 let state={channelId:null,open:false,query:'',items:[],index:0},suppressFocus=false;
 const current=()=>ctx.show().channels.find(c=>c.id===state.channelId);
 function field(c){state={channelId:c.id,open:false,query:c.mic||'',items:[],index:0};return `<div class="mic-quick"><label class="field" for="mic-quick-input"><span>Microphone / DI</span><div class="mic-quick-search">${icon('search',15)}<input id="mic-quick-input" name="micSearch" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="mic-quick-options" autocomplete="off" spellcheck="false" placeholder="Rechercher un micro ou une DI…" value="${esc(c.mic||'')}"></div></label><div id="mic-quick-popup" class="mic-quick-popup" hidden></div></div>`;}
 function close(){state.open=false;$('#mic-quick-popup')?.setAttribute('hidden','');const input=$('#mic-quick-input');if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');input.value=current()?.mic||'';}}
 function position(){
  if(!state.open)return;const input=$('#mic-quick-input'),popup=$('#mic-quick-popup');if(!input||!popup)return;
  const r=input.closest('.mic-quick-search').getBoundingClientRect();if(r.bottom<0||r.top>innerHeight){close();return;}
  const below=innerHeight-r.bottom-10,above=r.top-10,up=below<240&&above>below,room=Math.max(100,Math.min(420,up?above:below));
  Object.assign(popup.style,{position:'fixed',left:`${Math.max(8,Math.min(r.left,innerWidth-r.width-8))}px`,right:'auto',width:`${Math.min(r.width,innerWidth-16)}px`,top:up?'auto':`${r.bottom+5}px`,bottom:up?`${innerHeight-r.top+5}px`:'auto',maxHeight:`${room}px`});
  const list=$('#mic-quick-options');if(list)list.style.maxHeight=`${Math.max(44,Math.min(280,room-(state.query.trim()?110:55)))}px`;
 }
 window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
 function highlight(){const input=$('#mic-quick-input');input?.setAttribute('aria-activedescendant',`mic-quick-option-${state.index}`);for(const [i,el]of [...document.querySelectorAll('#mic-quick-options [role="option"]')].entries()){el.setAttribute('aria-selected',String(i===state.index));el.classList.toggle('active',i===state.index);if(i===state.index)el.scrollIntoView({block:'nearest',inline:'nearest'});}}
 function search(){
  if(!$('#mic-quick-popup'))return;
  state.open=true;state.query=$('#mic-quick-input').value;state.items=searchMicrophones({query:state.query,custom:ctx.custom()}).slice(0,8);state.index=0;
  $('#mic-quick-popup').innerHTML=`<div class="mic-quick-caption">${state.items.length?'Sélectionner un modèle':'Aucun modèle correspondant'}</div><div id="mic-quick-options" role="listbox" aria-label="Suggestions de microphones">${state.items.map((m,i)=>`<button type="button" role="option" tabindex="-1" id="mic-quick-option-${i}" aria-selected="${i===0}" class="mic-quick-option ${i===0?'active':''}" data-action="mic-quick-select" data-mic="${m.id}" ${m.custom&&!m.verified?'disabled aria-disabled="true"':''}><span><b>${esc(m.brand)} ${esc(m.model)}</b><small>${esc(TYPES[m.type])} · ${esc(PATTERNS[m.pattern])}</small></span><em class="${POWER[m.power].tone}">${esc(POWER[m.power].label)}</em></button>`).join('')||'<p class="mic-quick-empty">Essayez un autre nom ou conservez un libellé libre.</p>'}</div>${state.query.trim()?`<button type="button" class="mic-quick-free" data-action="mic-quick-free">Libellé libre : « ${esc(state.query.trim())} »<small>Alimentation manuelle, sans reconnaissance du modèle</small></button>`:''}<div class="mic-quick-help">↑ ↓ parcourir · Entrée sélectionner · Échap annuler</div>`;
  $('#mic-quick-popup').removeAttribute('hidden');$('#mic-quick-input').setAttribute('aria-expanded','true');if(state.items.length)$('#mic-quick-input').setAttribute('aria-activedescendant','mic-quick-option-0');else $('#mic-quick-input').removeAttribute('aria-activedescendant');position();
 }
 function choose(m,free=false){
  const id=state.channelId,label=state.query.trim();if(!current()||free&&!label)return;
  try{
   ctx.mutate(s=>{const c=s.channels.find(c=>c.id===id);if(free){for(const x of s.channels.filter(x=>x.bank===c.bank&&x.input===c.input&&x.mode===c.mode)){x.mic=label;delete x.micId;delete x.micProfile;x.phantomMode='manual';}}else applyMicrophone(s,c,m,c.micId===m.id?c.powerChoice||'default':'default');});
   suppressFocus=true;$('#mic-quick-input')?.focus({preventScroll:true});suppressFocus=false;close();
   ctx.toast(free?'Libellé conservé · alimentation à régler manuellement.':`${m.brand} ${m.model} sélectionné · alimentation préparée.`);
  }catch(error){ctx.toast(error.message,'error');}
 }
 function onInput(el){if(el.id!=='mic-quick-input')return false;search();return true;}
 function onFocusIn(e){if(e.target.id==='mic-quick-input'&&!suppressFocus)search();}
 function onFocusOut(e){if(e.target.closest?.('.mic-quick')&&!e.relatedTarget?.closest?.('.mic-quick'))close();}
 function onPointerDown(e){if(state.open&&!e.target.closest('.mic-quick'))close();if(e.target.closest('#mic-quick-options'))e.preventDefault();}
 function onKeyDown(e){
  if(e.target.id!=='mic-quick-input')return false;
  if(e.key==='Escape'&&state.open){e.preventDefault();close();return true;}
  if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!state.open)search();else if(state.items.length){state.index=(state.index+(e.key==='ArrowDown'?1:-1)+state.items.length)%state.items.length;highlight();}return true;}
  if(e.key==='Enter'){e.preventDefault();if(state.open&&state.items[state.index])choose(state.items[state.index]);return true;}
  return false;
 }
 function onClick(action,el){if(action==='mic-quick-select'){const m=ctx.all().find(m=>m.id===el.dataset.mic);if(m)choose(m);return true;}if(action==='mic-quick-free'){choose(null,true);return true;}return false;}
 return {field,onInput,onClick,onKeyDown,onFocusIn,onFocusOut,onPointerDown};
}

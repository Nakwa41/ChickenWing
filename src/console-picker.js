import {consoleModel,consoleBrands,consoleFamilies,consoleOptions} from './consoles.js';

// Use native selects for keyboard navigation and mobile pickers. Only the model
// belongs to the form/project; brand and family are catalogue filters.
export function consolePicker(value,{esc,modelAttributes='name="model" data-field="model"'}){
 const model=consoleModel(value),options=(choices,current)=>choices.map(([id,name])=>`<option value="${esc(id)}" ${id===current?'selected':''}>${esc(name)}</option>`).join('');
 return `<div class="console-picker"><label class="field"><span>Marque</span><select data-console-brand>${options(consoleBrands(),model.brand)}</select></label><label class="field"><span>Gamme</span><select data-console-family>${options(consoleFamilies(model.brand),model.family)}</select></label><label class="field"><span>Modèle de console</span><select data-console-model ${modelAttributes}>${options(consoleOptions(model.brand,model.family),model.id)}</select></label></div>`;
}

export function syncConsolePicker(picker,value){
 const model=consoleModel(value);
 picker.querySelector('[data-console-brand]').value=model.brand;
 picker.querySelector('[data-console-family]').replaceChildren(...consoleFamilies(model.brand).map(([id,name])=>new Option(name,id,false,id===model.family)));
 const select=picker.querySelector('[data-console-model]');
 select.replaceChildren(...consoleOptions(model.brand,model.family).map(([id,name])=>new Option(name,id,false,id===model.id)));
}

export function changeConsoleSelection(el){
 if(!el.matches('[data-console-brand],[data-console-family]'))return false;
 const picker=el.closest('.console-picker'),select=picker.querySelector('[data-console-model]');
 const brand=picker.querySelector('[data-console-brand]').value,families=consoleFamilies(brand);
 const currentFamily=picker.querySelector('[data-console-family]').value;
 const family=families.some(([id])=>id===currentFamily)?currentFamily:families[0]?.[0];
 const choices=consoleOptions(brand,family),model=choices.some(([id])=>id===select.value)?select.value:choices[0]?.[0];
 if(!model)return true;
 syncConsolePicker(picker,model);
 select.dispatchEvent(new Event('change',{bubbles:true}));
 return true;
}

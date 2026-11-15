import {uid} from './core.js';
import {STAGE_SYMBOLS, reorderStageLinks, stageItems, stageLinkKey, stageName, stagePatch, stagePlot, stagePosition} from './stage-plan.js';

const STAGE_DIRECTIONS = [['in','Entrée'],['out','Sortie']];
const ARROWS = {ArrowLeft:[-2,0], ArrowRight:[2,0], ArrowUp:[0,-2], ArrowDown:[0,2]};

function freePosition(items) {
  for (const y of [19,42,65,87]) {
    for (const x of [42,58,26,74,10,90]) {
      if (!items.some(item => Math.abs(item.x - x) < 15 && Math.abs(item.y - y) < 19)) return {x,y};
    }
  }
  return {x:50,y:52};
}

export function mountStageEditor(root, {show, version, save, esc, icon}) {
  let items = stageItems(show), selected = '', drag = null, draggedLink = null, dropRow = null;
  const patch = stagePatch(show);
  const options = current => Object.entries(STAGE_SYMBOLS).map(([kind,[label]]) => `<option value="${kind}" ${kind === current ? 'selected' : ''}>${esc(label)}</option>`).join('');
  const patchOptions = entries => entries.map(([key,entry]) => `<option value="${esc(key)}">${esc(`${entry.ref} · ${entry.name}`)}</option>`).join('');
  const patchGroups = STAGE_DIRECTIONS.map(([direction,label]) => {
    const entries = [...patch].filter(([,entry]) => entry.direction === direction);
    return entries.length ? `<optgroup label="${label}s">${patchOptions(entries)}</optgroup>` : '';
  }).join('');
  root.innerHTML = `<div class="stage-toolbar">
    <div class="stage-toolbar-title"><strong>${esc(version)}</strong><p>Glissez les symboles ou déplacez-les avec les flèches.</p></div>
    <div class="stage-add-tools">
      <label class="field"><span>Élément</span><select data-stage-kind>${options('drums')}</select></label>
      <button type="button" class="btn primary small" data-stage-add>${icon('plus',16)}Ajouter</button>
      ${patchGroups ? `<label class="field stage-quick-add"><span>Ajouter depuis le patch</span><select data-stage-quick><option value="">Choisir un patch…</option>${patchGroups}</select></label>` : ''}
    </div>
  </div>
  <div class="stage-layout">
    <div class="stage-drawing" data-stage-drawing></div>
    <aside class="stage-inspector" aria-label="Propriétés de l’élément" data-stage-inspector></aside>
  </div>`;
  const drawing = root.querySelector('[data-stage-drawing]');
  const inspector = root.querySelector('[data-stage-inspector]');
  const marker = id => [...drawing.querySelectorAll('[data-stage-marker]')].find(el => el.dataset.stageMarker === id);
  const current = () => items.find(item => item.id === selected);

  function draw() {
    drawing.innerHTML = stagePlot(items, patch, esc, {interactive:true, selected});
  }

  function inspect() {
    const item = current();
    if (!item) {
      inspector.innerHTML = '<h3>Élément sélectionné</h3><p>Sélectionnez un symbole pour le nommer et lui associer des entrées ou des sorties.</p>';
      return;
    }
    const linked = new Set(item.links.map(stageLinkKey));
    const controls = STAGE_DIRECTIONS.map(([direction,label]) => {
      const entries = [...patch].filter(([key,entry]) => entry.direction === direction && !linked.has(key));
      const group = item.links.filter(link => link.direction === direction);
      const links = group.map((link,index) => {
        const key = stageLinkKey(link), entry = patch.get(key);
        const title = entry ? `${entry.ref} · ${entry.name}` : 'Patch supprimé';
        const order = group.length > 1 ? `<button type="button" class="stage-link-grip" draggable="true" data-stage-grip title="Glisser pour réordonner" aria-label="${esc(`Réordonner ${title}`)}" aria-keyshortcuts="ArrowUp ArrowDown">⠿</button>` : '';
        const steps = group.length > 1 ? `<div class="stage-link-steps">
          <button type="button" data-stage-step="-1" aria-label="${esc(`Monter ${title}`)}" ${index===0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-stage-step="1" aria-label="${esc(`Descendre ${title}`)}" ${index===group.length-1 ? 'disabled' : ''}>↓</button>
        </div>` : '';
        return `<li data-stage-link-row="${esc(key)}">${order}<div class="stage-link-text"><b>${esc(title)}</b>${entry ? `<small>${esc(entry.port)}</small>` : ''}</div>${steps}<button type="button" class="icon-btn" data-stage-unlink="${esc(key)}" aria-label="${esc(`Dissocier ${entry?.name || label.toLowerCase()}`)}">${icon('close',15)}</button></li>`;
      }).join('');
      return `<div class="stage-links ${direction}">${links ? `<ul>${links}</ul>` : ''}<label class="field"><span>${label} à associer</span><select data-stage-link="${direction}" ${entries.length ? '' : 'disabled'}><option value="">${entries.length ? 'Choisir dans le patch…' : 'Aucun patch disponible'}</option>${patchOptions(entries)}</select></label></div>`;
    }).join('');
    inspector.innerHTML = `<h3>Repère ${items.indexOf(item) + 1}</h3>
      <label class="field"><span>Nom sur le plan</span><input data-stage-name maxlength="60" value="${esc(item.name)}" placeholder="${esc(stageName({...item,name:''}, patch))}"></label>
      <label class="field"><span>Symbole</span><select data-stage-symbol>${options(item.kind)}</select></label>
      ${controls}
      <button type="button" class="btn danger-text small" data-stage-delete>${icon('trash',16)}Retirer du plan</button>`;
  }

  function selectItem(id) {
    if (selected === id) return;
    marker(selected)?.setAttribute('aria-pressed','false');
    selected = id;
    marker(selected)?.setAttribute('aria-pressed','true');
    inspect();
  }

  function add(kind, entry) {
    const item = {id:uid(), name:'', kind, ...freePosition(items), links:entry ? [{direction:entry.direction,id:entry.id}] : []};
    items = [...items,item];
    selected = item.id;
    save(items);
    draw();
    inspect();
  }

  function changeOrder(sourceKey, targetKey) {
    const item = current();
    if (!item) return;
    const links = reorderStageLinks(item.links, sourceKey, targetKey);
    if (links === item.links) return;
    item.links = links;
    save(items);
    draw();
    inspect();
    const row = [...inspector.querySelectorAll('[data-stage-link-row]')].find(el => el.dataset.stageLinkRow === sourceKey);
    row?.querySelector('[data-stage-grip]').focus();
  }

  function stepLink(row, direction) {
    const target = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (target) changeOrder(row.dataset.stageLinkRow, target.dataset.stageLinkRow);
  }

  root.addEventListener('click', event => {
    const control = event.target.closest('button');
    if (!control) return;
    if (control.hasAttribute('data-stage-add')) {
      add(root.querySelector('[data-stage-kind]').value);
    } else if (control.dataset.stageStep) {
      stepLink(control.closest('[data-stage-link-row]'), Number(control.dataset.stageStep));
    } else if (control.dataset.stageMarker) {
      selectItem(control.dataset.stageMarker);
    } else if (control.hasAttribute('data-stage-delete')) {
      items = items.filter(item => item.id !== selected);
      selected = '';
      save(items);
      draw();
      inspect();
      root.querySelector('[data-stage-add]').focus();
    } else if (control.dataset.stageUnlink) {
      const item = current();
      item.links = item.links.filter(link => stageLinkKey(link) !== control.dataset.stageUnlink);
      save(items);
      draw();
      inspect();
      inspector.querySelector('[data-stage-link="' + control.dataset.stageUnlink.split(':')[0] + '"]').focus();
    }
  });

  root.addEventListener('change', ({target}) => {
    if (target.hasAttribute('data-stage-quick')) {
      const entry = patch.get(target.value);
      target.value = '';
      if (entry) add(entry.kind, entry);
      return;
    }
    const item = current();
    if (!item) return;
    if (target.hasAttribute('data-stage-name')) {
      item.name = target.value.trim();
      const label = stageName(item, patch), element = marker(item.id);
      element.querySelector('.stage-marker-name').textContent = label;
      element.setAttribute('aria-label', `${items.indexOf(item) + 1}. ${label}`);
      save(items);
      return;
    } else if (target.hasAttribute('data-stage-symbol')) {
      item.kind = target.value;
      inspector.querySelector('[data-stage-name]').placeholder = stageName({...item,name:''}, patch);
    } else if (target.dataset.stageLink) {
      const entry = patch.get(target.value);
      if (!entry) return;
      item.links = [...item.links,{direction:entry.direction,id:entry.id}];
      inspect();
      inspector.querySelector(`[data-stage-link="${entry.direction}"]:not(:disabled)`)?.focus();
    } else return;
    save(items);
    draw();
  });

  inspector.addEventListener('keydown', event => {
    if (event.target.hasAttribute('data-stage-grip') && ['ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault();
      stepLink(event.target.closest('[data-stage-link-row]'), event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key !== 'Enter' || !event.target.hasAttribute('data-stage-name')) return;
    event.preventDefault();
    event.target.blur();
    marker(selected)?.focus();
  });

  function clearDrop() {
    if (dropRow) delete dropRow.dataset.stageDrop;
    dropRow = null;
  }

  inspector.addEventListener('dragstart', event => {
    const handle = event.target.closest('[data-stage-grip]');
    if (!handle) return;
    draggedLink = handle.closest('[data-stage-link-row]');
    draggedLink.classList.add('stage-link-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedLink.dataset.stageLinkRow);
  });

  inspector.addEventListener('dragover', event => {
    const row = event.target.closest('[data-stage-link-row]');
    if (row === dropRow) {
      if (dropRow) event.preventDefault();
      return;
    }
    clearDrop();
    if (!draggedLink || !row || row === draggedLink || row.parentElement !== draggedLink.parentElement) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dropRow = row;
    const after = draggedLink.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING;
    row.dataset.stageDrop = after ? 'after' : 'before';
  });

  inspector.addEventListener('drop', event => {
    const row = event.target.closest('[data-stage-link-row]');
    if (!draggedLink || row !== dropRow || !row) return;
    event.preventDefault();
    const source = draggedLink.dataset.stageLinkRow;
    draggedLink.classList.remove('stage-link-dragging');
    draggedLink = null;
    clearDrop();
    changeOrder(source, row.dataset.stageLinkRow);
  });

  inspector.addEventListener('dragend', () => {
    draggedLink?.classList.remove('stage-link-dragging');
    draggedLink = null;
    clearDrop();
  });

  drawing.addEventListener('keydown', event => {
    const id = event.target.dataset.stageMarker, delta = ARROWS[event.key];
    if (!id || !delta) return;
    event.preventDefault();
    selectItem(id);
    const item = current();
    Object.assign(item, stagePosition(item.x + delta[0], item.y + delta[1]));
    save(items);
    event.target.style.setProperty('--x', item.x + '%');
    event.target.style.setProperty('--y', item.y + '%');
  });

  drawing.addEventListener('pointerdown', event => {
    const element = event.target.closest('[data-stage-marker]');
    if (!element || !event.isPrimary || event.button !== 0) return;
    if (inspector.contains(document.activeElement)) document.activeElement.blur();
    selectItem(element.dataset.stageMarker);
    const item = current(), board = element.closest('[data-stage-board]');
    const {width,height} = board.getBoundingClientRect();
    drag = {element, item, pointer:event.pointerId, width, height, startX:event.clientX, startY:event.clientY, position:null};
    element.setPointerCapture(event.pointerId);
  });

  drawing.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.pointer) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.position && Math.hypot(dx,dy) < 3) return;
    drag.position = stagePosition(drag.item.x + dx * 100 / drag.width, drag.item.y + dy * 100 / drag.height);
    drag.element.style.setProperty('--x', drag.position.x + '%');
    drag.element.style.setProperty('--y', drag.position.y + '%');
  });

  drawing.addEventListener('pointerup', event => {
    if (event.pointerId !== drag?.pointer) return;
    if (drag.position) {
      Object.assign(drag.item, drag.position);
      save(items);
    }
    drag = null;
  });

  drawing.addEventListener('lostpointercapture', event => {
    if (event.pointerId !== drag?.pointer) return;
    drag.element.style.setProperty('--x', drag.item.x + '%');
    drag.element.style.setProperty('--y', drag.item.y + '%');
    drag = null;
  });

  draw();
  inspect();
}

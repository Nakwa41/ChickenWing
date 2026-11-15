import {consoleProfile, nativeExtension} from './consoles.js';
import {SHEET_SECTIONS, sheetState, showSheet} from './show-sheet.js';
import {stageAnnotations, stageIcon, stageItems, stagePatch, stagePlot} from './stage-plan.js';
import {mountStageEditor} from './stage-plan-ui.js';

const dateLabel = value => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
};

export function createExportUI({show, mutate, esc, icon, btn, toast}) {
  const enabled = new Set(['stage', ...SHEET_SECTIONS.map(([id]) => id)]);
  let theme = 'light', showId, snapshotId = '';

  function snapshot() {
    const s = show();
    if (s.id !== showId) {
      showId = s.id;
      snapshotId = '';
    }
    return s.snapshots.find(snap => String(snap.id) === snapshotId);
  }

  function view() {
    const s = show(), selected = snapshot();
    return `<div class="panel-heading sheet-controls"><h2 id="sheet-heading">Fiche technique A4</h2>
      <div class="panel-actions">${btn('Plan de scène','edit-stage-plan','grid','secondary','aria-controls="stage-plan-editor" aria-expanded="false"')}${btn('Imprimer / Enregistrer en PDF','print-show-sheet','download','primary','id="sheet-print"')}</div></div>
      <div id="stage-plan-editor" class="stage-editor" hidden></div>
      <div class="sheet-workspace" id="sheet-workspace">
        <aside class="sheet-settings" aria-label="Options d’export">
          <label class="field"><span>Version du show</span><select id="sheet-version"><option value="">État actuel</option>${s.snapshots.filter(snap => snap.id != null).map(snap => `<option value="${esc(snap.id)}" ${snap === selected ? 'selected' : ''}>${esc(snap.name)}</option>`).join('')}</select></label>
          <div id="sheet-snapshot-file"></div>
          <fieldset><legend>À inclure</legend>${[['stage','Plan de scène'],...SHEET_SECTIONS].map(([id,label]) => `<label><input type="checkbox" data-sheet-section="${id}" ${enabled.has(id) ? 'checked' : ''}>${label}</label>`).join('')}</fieldset>
          <fieldset class="sheet-themes"><legend>Thème</legend><label><input type="radio" name="sheet-theme" value="light" ${theme === 'light' ? 'checked' : ''}>Clair · papier</label><label><input type="radio" name="sheet-theme" value="dark" ${theme === 'dark' ? 'checked' : ''}>Sombre · écran</label></fieldset>
          <p class="sheet-print-hint">Dans la fenêtre d’impression, choisissez une imprimante ou « Enregistrer en PDF ».</p>
        </aside>
        <div class="sheet-preview"><div class="sheet-preview-bar"><span>${icon('file',16)} Aperçu de la fiche</span><span id="sheet-preview-status" aria-live="polite"></span></div><div class="sheet-preview-scroll" role="region" aria-label="Aperçu du document A4" tabindex="0"><div id="sheet-pages" class="sheet-pages"></div></div></div>
      </div>`;
  }

  function mount() {
    const pages = document.querySelector('#sheet-pages');
    if (!pages) return;
    const snap = snapshot(), s = sheetState(show(), snap), items = stageItems(s);
    const planCheckbox = document.querySelector('[data-sheet-section="stage"]');
    planCheckbox.disabled = !items.length;
    planCheckbox.checked = !!items.length && enabled.has('stage');
    const patch = planCheckbox.checked ? stagePatch(s) : null;
    const sections = showSheet(s, enabled, patch ? stageAnnotations(items, patch) : undefined);
    if (patch) sections.unshift({title:'Plan de scène', graphic:stagePlot(items, patch, esc), tables:[]});
    const snapButton = document.querySelector('#sheet-snapshot-file');
    snapButton.innerHTML = snap ? btn(`Snapshot ${nativeExtension(s)}`, 'download-snapshot', 'download', 'small secondary', `data-id="${esc(snap.id)}"`) : '';
    const status = document.querySelector('#sheet-preview-status');
    document.querySelector('#sheet-print').disabled = !sections.length;
    pages.dataset.theme = theme;
    pages.replaceChildren();
    if (!sections.length) {
      status.textContent = 'A4 · Portrait';
      pages.innerHTML = '<p class="sheet-empty">Sélectionnez au moins une rubrique pour composer la fiche.</p>';
      return;
    }

    const consoleName = consoleProfile(s).name;
    const info = [s.artist, dateLabel(s.date), s.venue].filter(Boolean).map(value => `<span>${esc(value)}</span>`).join('');
    const version = snap ? `Snapshot · ${snap.name}` : 'État actuel';
    const firstHeader = `<div class="sheet-masthead"><span>CHICKENWING</span><span>FICHE TECHNIQUE</span></div><h2>${esc(s.name)}</h2>${info ? `<div class="sheet-identity">${info}</div>` : ''}<div class="sheet-revision"><strong>${esc(consoleName)}</strong><span>${esc(version)}</span></div>`;
    const nextHeader = `<div class="sheet-running-header"><strong>${esc(s.name)}</strong><span>${esc(consoleName)} · ${esc(version)}</span></div>`;
    let page, body, group;

    function newPage() {
      const header = page ? nextHeader : firstHeader;
      pages.insertAdjacentHTML('beforeend', `<article class="sheet-page"><header>${header}</header><div class="sheet-page-body"></div><footer><span>CHICKENWING · FICHE TECHNIQUE</span><span class="sheet-page-number"></span></footer></article>`);
      page = pages.lastElementChild;
      body = page.querySelector('.sheet-page-body');
      group = null;
    }

    function startSection(section, continued) {
      body.insertAdjacentHTML('beforeend', `<section class="sheet-section"><h3>${esc(section.title)}${continued ? '<small>SUITE</small>' : ''}</h3>${section.legend ? `<p class="sheet-legend">${esc(section.legend)}</p>` : ''}</section>`);
      group = body.lastElementChild;
    }

    function startTable(table) {
      const cols = table.columns.map(([, width]) => `<col style="width:${width}%">`).join('');
      const headings = table.columns.map(([label]) => `<th scope="col">${esc(label)}</th>`).join('');
      group.insertAdjacentHTML('beforeend', `<table>${table.caption ? `<caption>${esc(table.caption)}</caption>` : ''}<colgroup>${cols}</colgroup><thead><tr>${headings}</tr></thead><tbody></tbody></table>`);
      return group.lastElementChild.tBodies[0];
    }

    const overflows = () => page.classList.contains('sheet-oversize') ||
      body.lastElementChild.getBoundingClientRect().bottom > body.getBoundingClientRect().bottom - 3;
    newPage();
    for (const section of sections) {
      group = null;
      if (section.graphic) {
        startSection(section, false);
        group.insertAdjacentHTML('beforeend', section.graphic);
        continue;
      }
      if (!section.tables.length) {
        const hasContent = !!body.firstElementChild;
        startSection(section, false);
        const empty = `<p class="sheet-no-data">${esc(section.empty)}</p>`;
        group.insertAdjacentHTML('beforeend', empty);
        if (hasContent && overflows()) {
          group.remove();
          newPage();
          startSection(section, false);
          group.insertAdjacentHTML('beforeend', empty);
        }
        continue;
      }
      let continued = false;
      for (const table of section.tables) {
        let rows;
        for (const row of table.rows) {
          const hasContent = !!body.firstElementChild;
          if (!group) startSection(section, continued);
          rows ||= startTable(table);
          const html = `<tr>${row.map(({text, detail, tone, annotations}, i) => {
            const labels = annotations?.map(({kind,name,direction}) =>
              `<span class="sheet-patch-marker ${direction}">${stageIcon(kind)}<span>${esc(name)}</span></span>`).join('') || '';
            return `<td class="${tone === 'alert' ? 'sheet-alert' : ''}">${i === 0 && row.length > 1 ? `<strong>${esc(text)}</strong>` : esc(text)}${labels}${detail ? `<small>${esc(detail)}</small>` : ''}</td>`;
          }).join('')}</tr>`;
          rows.insertAdjacentHTML('beforeend', html);
          if (hasContent && overflows()) {
            rows.lastElementChild.remove();
            if (!rows.children.length) rows.closest('table').remove();
            if (!group.querySelector('table')) group.remove();
            newPage();
            startSection(section, continued);
            rows = startTable(table);
            rows.insertAdjacentHTML('beforeend', html);
          }
          // A single unusually long imported record can flow onto a second printed page.
          if (overflows()) page.classList.add('sheet-oversize');
          continued = true;
        }
      }
    }
    const numbers = [...pages.querySelectorAll('.sheet-page-number')];
    numbers.forEach((el,i) => { el.textContent = `${String(i + 1).padStart(2,'0')} / ${String(numbers.length).padStart(2,'0')}`; });
    status.textContent = `A4 · Portrait · ${numbers.length} page${numbers.length > 1 ? 's' : ''}`;
  }

  function editStage(button) {
    const editor = document.querySelector('#stage-plan-editor');
    const workspace = document.querySelector('#sheet-workspace');
    const printButton = document.querySelector('#sheet-print');
    const editing = editor.hidden;
    editor.hidden = !editing;
    workspace.classList.toggle('sheet-editor-open', editing);
    printButton.hidden = editing;
    document.querySelector('#sheet-heading').textContent = editing ? 'Plan de scène' : 'Fiche technique A4';
    button.setAttribute('aria-expanded', String(editing));
    button.lastChild.textContent = editing ? 'Revenir à l’aperçu A4' : 'Plan de scène';
    if (!editing) {
      editor.replaceChildren();
      mount();
      return;
    }
    const snap = snapshot();
    const panel = document.createElement('div');
    editor.replaceChildren(panel);
    mountStageEditor(panel, {
      show:sheetState(show(), snap),
      version:snap ? `Snapshot · ${snap.name}` : 'État actuel',
      save:items => mutate(s => {
        const target = snap ? s.snapshots.find(item => item.id === snap.id)?.data : s;
        if (target) target.stagePlan = structuredClone(items);
      }),
      esc, icon
    });
  }

  function onChange(el) {
    if (el.id === 'sheet-version') snapshotId = el.value;
    else if (el.name === 'sheet-theme') theme = el.value;
    else if (el.dataset.sheetSection) {
      if (el.checked) enabled.add(el.dataset.sheetSection);
      else enabled.delete(el.dataset.sheetSection);
    } else return false;
    mount();
    return true;
  }

  function print() {
    if (!document.querySelector('.sheet-page')) return;
    if (typeof window.print !== 'function') {
      toast('L’impression est indisponible dans ce navigateur.', 'error');
      return;
    }
    const title = document.title;
    const snap = snapshot();
    document.title = [show().name, snap?.name, 'Fiche technique'].filter(Boolean).join(' - ');
    try { window.print(); }
    finally { document.title = title; }
  }

  window.addEventListener('beforeprint', () => {
    const editor = document.querySelector('#stage-plan-editor');
    if (!editor || editor.hidden) return;
    if (document.activeElement?.matches('[data-stage-name]')) document.activeElement.blur();
    const workspace = document.querySelector('#sheet-workspace');
    workspace.classList.remove('sheet-editor-open');
    try { mount(); }
    finally { workspace.classList.add('sheet-editor-open'); }
  });

  return {view, mount, editStage, onChange, print};
}

import {bankOptions} from './consoles.js';
import {BANKS} from './core.js';
import {patchConnector, strip, stripAddress} from './show-sheet.js';

// The same vector symbols are used on the editor and the printed plan.
export const STAGE_SYMBOLS = {
  drums: ['Batterie', 'M6 10V7m20 3V7M2 7h8m12 0h8M6 23v5m20-5v5 M3 13h7v9H3z m19 0h7v9h-7z M16 14a7 7 0 1 0 0 14 7 7 0 1 0 0-14z M13 11V6h6v5z'],
  percussion: ['Percussions', 'M3 7a6 2 0 1 0 12 0 6 2 0 1 0-12 0z M3 7l3 18q3 3 6 0l3-18 M17 11a6 2 0 1 0 12 0 6 2 0 1 0-12 0z M17 11l3 14q3 3 6 0l3-14'],
  bass: ['Basse', 'M18 15 25 4l4 2-8 12 M18 15c-4-4-4 3-7 2-4-2-8 2-8 6s4 7 8 6c5-1 3-6 7-7 3 0 5-2 3-4 M8 24 28 3m-13 15 3 3'],
  guitar: ['Guitare', 'M17 14 25 3l4 3-9 10 M17 14c-4-4-7 0-5 3s-8-1-9 6 10 9 12 2c1-4 3-2 5-5 1-2 1-3 0-4 M7 24l4 3m2-6 2 2'],
  acoustic: ['Guitare acoustique', 'M18 15 25 4l4 2-8 12 M18 15c-5-5-8-2-7 2s-8 0-9 6 8 10 12 5c3-4 2-6 5-6 4-1 5-5 2-6 M8 24l3 2 M14 20a2 2 0 1 0 4 0 2 2 0 1 0-4 0z'],
  keys: ['Clavier', 'M2 8h28v16H2z M2 12h28 M7 12v12m6-12v12m6-12v12m6-12v12 M7 12v7m6-7v7m12-7v7'],
  brass: ['Cuivres', 'M2 15h4m0-2v6l19 1 4 4V8l-4 4-19 1z M12 13V8m4 5V8m4 5V8 M11 8h2m2 0h2m2 0h2 M8 20c2 6 12 6 13 0'],
  strings: ['Cordes', 'M19 15 27 3l2 1-8 13 M19 15c-3-4-5-3-6-1s1 3-1 5-5-1-7 3c-3 4 4 10 8 7 4-2 1-5 3-7s3 1 5-1 2-4 0-4 M9 24l3 3 M3 21 17 3'],
  mic: ['Micro sur pied', 'M16 4a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V8a4 4 0 0 1 4-4z M12 9h8 M8 13a8 8 0 0 0 16 0 M16 21v7m-5 0h10'],
  di: ['Boîte DI', 'M4 9h24v15H4z m0 13 3 6h24V12l-3-3 M9 14h4m-4 4h4 M19 16a2 2 0 1 0 4 0 2 2 0 1 0-4 0z'],
  wedge: ['Retour de scène', 'M3 23l5-13h15l6 13z M3 23v3h26v-3 M8 19h16 M11 15h10'],
  ears: ['In-ear', 'M7 18V12a9 9 0 0 1 18 0v6 M7 16H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v-8z m18 0h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-3v-8z M24 24c0 4-3 5-8 5'],
  speaker: ['Enceinte', 'M8 3h16v20H8z M16 23v5m-6 1 6-1 6 1 M16 12a4 4 0 1 0 0 8 4 4 0 1 0 0-8z M15 7h2'],
  rack: ['Stagebox', 'M3 8h26v16H3z M6 12h20m-20 8h20 M8 16h1m4 0h1m4 0h1m4 0h1 M1 11v10m30-10v10'],
  note: ['Repère libre', 'M15 29S6 21 6 13a10 10 0 1 1 20 0c0 8-10 16-10 16z M16 9a4 4 0 1 0 0 8 4 4 0 1 0 0-8z']
};

export function stageIcon(kind) {
  const path = STAGE_SYMBOLS[kind]?.[1] || STAGE_SYMBOLS.note[1];
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}

export const stageLinkKey = ({direction,id}) => `${direction}:${id}`;

export function reorderStageLinks(links, sourceKey, targetKey) {
  const source = links.find(link => stageLinkKey(link) === sourceKey);
  if (!source || sourceKey === targetKey) return links;
  const group = links.filter(link => link.direction === source.direction);
  const target = group.findIndex(link => stageLinkKey(link) === targetKey);
  if (target < 0) return links;
  group.splice(group.indexOf(source), 1);
  group.splice(target, 0, source);
  let index = 0;
  return links.map(link => link.direction === source.direction ? group[index++] : link);
}

export function stagePatch(show) {
  const result = new Map();
  for (const output of [false, true]) {
    const labels = new Map(bankOptions(show, output));
    const records = output ? show.outputs : show.channels;
    for (const record of [...records].sort((a,b) => (a.n ?? a.bus) - (b.n ?? b.bus))) {
      const direction = output ? 'out' : 'in';
      const port = patchConnector(show, record, output);
      const bank = labels.get(record.bank) || BANKS[record.bank] || record.bank;
      const entry = {
        id:String(record.id), direction, name:record.name, address:stripAddress(show, record),
        ref:strip(show, record), port:[`${bank} · ${output ? 'OUT' : 'IN'} ${port.text}`,port.detail].filter(Boolean).join(' · '),
        kind:output ? ({IEM:'ears', Main:'speaker'})[record.type] || 'wedge' : 'mic'
      };
      result.set(stageLinkKey(entry), entry);
    }
  }
  return result;
}

export function stagePosition(x, y) {
  return {
    x:Math.round(Math.max(8, Math.min(92, x)) * 10) / 10,
    y:Math.round(Math.max(11, Math.min(89, y)) * 10) / 10
  };
}

export function stageItems(show) {
  if (!Array.isArray(show.stagePlan)) return [];
  return show.stagePlan.flatMap(item => {
    if (!item || typeof item.id !== 'string' || !Object.hasOwn(STAGE_SYMBOLS, item.kind) || !Number.isFinite(item.x) || !Number.isFinite(item.y)) return [];
    const links = Array.isArray(item.links) ? item.links.filter(link => link && ['in','out'].includes(link.direction) && typeof link.id === 'string') : [];
    return [{id:item.id, kind:item.kind, name:typeof item.name === 'string' ? item.name : '', ...stagePosition(item.x, item.y), links}];
  });
}

export function stageName(item, patch) {
  if (item.name) return item.name;
  const linked = item.links.map(link => patch.get(stageLinkKey(link))).filter(Boolean);
  const singleSource = linked.filter(link => link.direction === 'in').length <= 1 && linked.filter(link => link.direction === 'out').length <= 1;
  return (singleSource && linked.find(link => link.direction === 'in')?.name) ||
    (singleSource && linked[0]?.name) || STAGE_SYMBOLS[item.kind][0];
}

export function stageAnnotations(items, patch) {
  const annotations = {in:new Map(),out:new Map()};
  for (const item of items) {
    const name = stageName(item, patch);
    for (const link of item.links) {
      if (!patch.has(stageLinkKey(link))) continue;
      const index = annotations[link.direction];
      if (!index.has(link.id)) index.set(link.id, []);
      const labels = index.get(link.id);
      if (!labels.some(label => label.kind === item.kind && label.name === name)) {
        labels.push({kind:item.kind,name,direction:link.direction});
      }
    }
  }
  return annotations;
}

function orderedReferences(links, patch, direction) {
  const groups = [];
  for (const link of links) {
    const address = patch.get(stageLinkKey(link))?.address;
    const label = address?.label || (direction === 'in' ? 'CH' : 'OUT');
    const start = Number.isInteger(address?.start) && address.start > 0 ? address.start : null;
    const end = start === null ? null : start + address.width - 1;
    if (groups.at(-1)?.label !== label) groups.push({label,ranges:[]});
    const ranges = groups.at(-1).ranges, last = ranges.at(-1);
    if (start !== null && last?.end != null && last.end + 1 === start) last.end = end;
    else ranges.push({start,end});
  }
  return groups.map(({label,ranges}) => `${label} ${ranges.map(({start,end}) => start === null ? '?' : start === end ? start : `${start}–${end}`).join(', ')}`).join(' · ');
}

export function stagePlot(items, patch, esc, {interactive = false, selected = ''} = {}) {
  const markers = items.map((item, index) => {
    const title = stageName(item, patch);
    const refs = ['in','out'].map(direction => [direction, orderedReferences(item.links.filter(link => link.direction === direction), patch, direction)]);
    const tags = refs.filter(([,label]) => label).map(([direction,label]) => `<span class="stage-tag ${direction}">${esc(label)}</span>`).join('');
    const ordinal = interactive ? `<span class="stage-index">${index + 1}</span>` : '';
    const body = `<span class="stage-symbol">${stageIcon(item.kind)}</span><span class="stage-marker-name">${esc(title)}</span><span class="stage-marker-tags">${tags}</span>${ordinal}`;
    const wide = refs.some(([,label]) => label.length > 26);
    const style = `style="--x:${item.x}%;--y:${item.y}%${wide ? ';--marker-width:26%' : ''}"`;
    return interactive
      ? `<button type="button" class="stage-marker" ${style} data-stage-marker="${esc(item.id)}" aria-pressed="${selected === item.id}" aria-label="${index + 1}. ${esc(title)}">${body}</button>`
      : `<div class="stage-marker" ${style}>${body}</div>`;
  }).join('');
  return `<div class="stage-plot"><div class="stage-orientation"><span>Fond de scène</span></div><div class="stage-board" ${interactive ? 'data-stage-board' : ''}>${markers}${interactive && !items.length ? '<p class="stage-board-empty">Ajoutez un élément pour commencer.</p>' : ''}</div><div class="stage-orientation stage-front"><span>Jardin</span><strong>Public</strong><span>Cour</span></div><div class="stage-key"><span class="stage-tag in">Entrées</span><span class="stage-tag out">Sorties</span></div></div>`;
}

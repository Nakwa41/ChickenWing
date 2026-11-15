import {BANKS, FX_MODELS, validate} from './core.js';
import {bankOptions, consoleModel, isDM3, isM32, isYamaha, logicalWidth, physicalWidth} from './consoles.js';
import {phantomCapable, recommendation, resolveMic} from './microphones.js';
import {M32_FX_MODELS} from './m32-effects.js';
import {getMixes} from './routing.js';
import {yamahaEffectInfo, yamahaFxCapacity, yamahaRack, yamahaSlotLabel} from './yamaha-effects.js';
import {resolveYamahaPort} from './yamaha-stageboxes.js';

export const SHEET_SECTIONS = [
  ['inputs', 'Patch d’entrées'],
  ['outputs', 'Patch de sorties'],
  ['fx', 'Effets & inserts'],
  ['mixes', 'Bus internes'],
  ['notes', 'Notes & contrôles']
];

export function sheetState(show, snapshot) {
  if (!snapshot) return show;
  const {id, name, artist, date, venue} = show;
  return {model:'wing', fx:[], ...snapshot.data, id, name, artist, date, venue};
}

const format = mode => ({M:'Mono', ST:'Stéréo', 'M/S':'M/S'})[mode] || 'À vérifier';
const decibels = value => Number.isFinite(value) ? value <= -144 ? '−∞ dB' : `${String(value).replace('.', ',')} dB` : '';
const cell = (text, detail = '', tone = '') => ({text, detail, tone});

function range(start, width = 1) {
  if (!Number.isInteger(start) || start < 1) return 'À vérifier';
  return width === 1 ? String(start) : `${start}–${start + width - 1}`;
}

export function stripAddress(show, item) {
  const kind = item.source || 'CH';
  const label = ({MAIN:'Main', MTX:'Matrice', BUS:isYamaha(show) ? 'MIX' : 'Bus', FXB:'FX BUS'})[kind] || kind;
  return {label, start:item.bus ?? item.n, width:logicalWidth(show, item)};
}

export function strip(show, item) {
  const {label,start,width} = stripAddress(show, item);
  return `${label} ${range(start, width)}`;
}

export function patchConnector(show, item, output) {
  const port = output ? item.port : item.input;
  const width = physicalWidth(item);
  const dante = isYamaha(show) && resolveYamahaPort(show, item.bank, port, output);
  return cell(range(port, width), dante?.stagebox ? `Dante ${range(dante.port, width)}` : '');
}

function phantom(channel) {
  if (phantomCapable(channel)) return cell(channel.phantom ? 'ON' : 'OFF', '', channel.phantom ? 'alert' : '');
  const mic = channel.micProfile || resolveMic(channel.mic);
  return mic && recommendation(mic, channel.powerChoice) ? cell('En amont', '', 'alert') : cell('—');
}

function patchTables(show, output, annotations) {
  const records = output ? show.outputs : show.channels;
  const bankLabels = new Map(bankOptions(show, output));
  const banks = new Set([...bankLabels.keys(), ...records.map(item => item.bank)]);
  const address = item => output ? item.port : item.input;
  const tables = [];
  for (const bank of banks) {
    const items = records.filter(item => item.bank === bank).sort((a,b) => address(a) - address(b) || (a.n ?? a.bus) - (b.n ?? b.bus));
    if (!items.length) continue;
    const portLabel = ['DANTE', 'USB', 'CRD', 'MOD', 'SLOT1', 'SLOT2', 'SLOT3'].includes(bank) ? 'Canal' : 'Prise';
    const columns = output
      ? [[`${portLabel} OUT`,15], ['Destination',42], ['Source console',24], ['Prélèvement',19]]
      : [[`${portLabel} IN`,14], ['Source plateau',32], ['Micro / DI',24], ['Voie',14], ['48 V',8], ['Gain',8]];
    const rows = items.map(item => {
      const connector = patchConnector(show, item, output);
      const side = output && item.busMono !== true ? ({L:'Côté gauche', R:'Côté droit'})[item.side] : '';
      const mode = ({M:side, ST:'Stéréo G/D', 'M/S':'M/S'})[item.mode] || '';
      const consoleStrip = cell(strip(show, item), mode);
      const notes = [item.spare && 'Secours', item.reviewed === false && 'À vérifier', item.notes, item.importMeta?.notes].filter(Boolean).join(' · ');
      const source = cell(item.name, output ? item.type : notes);
      source.annotations = annotations?.get(String(item.id));
      if (output) return [connector, source, consoleStrip, cell(item.tap || '—', item.mute ? 'Mute' : '')];
      return [connector, source, cell(item.mic || '—'), consoleStrip, phantom(item), cell(decibels(item.gain) || '—')];
    });
    tables.push({caption:bankLabels.get(bank) || BANKS[bank] || bank || 'Interface à vérifier', columns, rows});
  }
  return tables;
}

function effectRows(show) {
  const yamaha = isYamaha(show), m32 = isM32(show);
  const racks = ['fx','premium','eq','channel'];
  return [...show.fx].sort((a,b) => racks.indexOf(yamahaRack(a)) - racks.indexOf(yamahaRack(b)) || a.slot - b.slot).map(f => {
    const info = yamaha && yamahaEffectInfo(show, f.model);
    const model = (yamaha ? info?.name : (m32 ? M32_FX_MODELS : FX_MODELS)[f.model]) || f.model;
    const location = cell(yamaha ? yamahaSlotLabel(show, f) : `FX ${f.slot}`, info?.size > 1 ? `${info.size} unités` : '');
    const state = cell(f.bypass ? 'Bypass' : 'Actif', Number.isFinite(f.mix) ? `Mix ${f.mix} %` : '', f.bypass ? 'alert' : '');
    if (f.usage === 'send') {
      const kind = yamaha ? yamahaFxCapacity(show).returnKind : 'Retour FX';
      const send = isDM3(show) ? `FX BUS ${f.slot}` : `${yamaha ? 'MIX' : 'Bus'} ${f.sendLeft || '—'}${f.sendRight ? ` / ${f.sendRight}` : ''}`;
      const dest = kind === 'Retour FX' ? f.slot : f.returnN;
      state.detail = [f.returnMute ? 'Retour muté' : decibels(f.returnLevel), state.detail].filter(Boolean).join(' · ');
      return [location, cell(model), cell(`${send} → ${kind} ${range(dest, kind === 'CH' ? 2 : 1)}`, 'Envoi / retour'), state];
    }
    if (f.usage === 'unassigned' || !f.target || !f.targetN) {
      return [location, cell(model), cell('Affectation à vérifier'), cell('—')];
    }
    const target = `${f.target} ${f.targetN}${f.rightTarget ? ` + ${f.rightTarget.replace('.', ' ')}` : ''}`;
    let position = f.position === 'preins' ? 'Avant EQ' : 'Après EQ';
    if (yamaha) position = f.usage === 'channel-eq' ? 'EQ natif' : `Insert ${f.insertSlot ?? '—'} · ${f.position === 'preins' ? (consoleModel(show).dm ? 'Avant DYN1' : 'Avant EQ') : 'Avant fader'}`;
    if (!yamaha && !m32) position = f.position === 'preins' ? 'Pré-insert' : 'Post-insert';
    return [location, cell(model), cell(target, position), state];
  });
}

export function showSheet(show, selection, stageAnnotations) {
  const enabled = new Set(selection);
  const sections = [];
  const add = (id, tables, empty, legend = '') => {
    sections.push({id, title:SHEET_SECTIONS.find(([key]) => key === id)[1], tables, empty, legend});
  };
  if (enabled.has('inputs')) add('inputs', patchTables(show, false, stageAnnotations?.in), 'Aucune entrée configurée.', 'ON / OFF indiquent le 48 V prévu. « En amont » indique une alimentation sur le préampli.');
  if (enabled.has('outputs')) add('outputs', patchTables(show, true, stageAnnotations?.out), 'Aucune sortie physique configurée.');
  if (enabled.has('fx')) {
    const rows = effectRows(show);
    add('fx', rows.length ? [{columns:[['Rack',17], ['Algorithme',29], ['Affectation',35], ['État',19]], rows}] : [], 'Aucun effet configuré.');
  }
  if (enabled.has('mixes')) {
    const rows = getMixes(show, {allMains:false}).filter(m => !m.bank).map(m => [cell(strip(show, m)), cell(m.name, m.type), cell(format(m.mode)), cell(m.mute ? 'Mute' : 'Ouvert', decibels(m.fader))]);
    add('mixes', rows.length ? [{columns:[['Bus',17], ['Nom',45], ['Format',18], ['État',20]], rows}] : [], 'Aucun bus interne configuré.');
  }
  if (enabled.has('notes')) {
    const notes = String(show.notes || '').trim();
    const tables = [];
    if (notes) tables.push({caption:'Notes de préparation', columns:[['Consignes',100]], rows:notes.match(/[^\n]{1,480}(?:\s|$)|[^\n]{1,480}|\n/gu).map(line => [cell(line)])});
    const issues = validate(show);
    if (issues.length) tables.push({caption:'Points à vérifier', columns:[['Niveau',19], ['Détail',81]], rows:issues.map(i => [cell(i.level === 'error' ? 'Erreur' : 'À vérifier', '', 'alert'), cell(i.text)])});
    add('notes', tables, 'Aucune note ni alerte pour cet état.');
  }
  return sections;
}

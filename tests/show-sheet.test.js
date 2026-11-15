import assert from 'node:assert/strict';
import test from 'node:test';
import {channel, demoShow, newShow} from '../src/core.js';
import {sheetState, showSheet} from '../src/show-sheet.js';
import {reorderStageLinks, stageAnnotations, stageItems, stagePatch, stagePlot} from '../src/stage-plan.js';
import {fxTestShow} from './fixtures/yamaha-fx-shows.js';

test('the wiring sheet sorts by physical port and distinguishes WING sources from linked console strips', () => {
  const show = newShow();
  show.channels = [
    channel(1, {input:11, mode:'ST', mic:'C414', phantom:true}),
    channel(3, {input:2, mic:'SM58'})
  ];
  const inputs = () => showSheet(show, ['inputs'])[0].tables[0].rows;
  assert.deepEqual(inputs().map(row => row[0].text), ['2', '11–12']);
  assert.equal(inputs()[1][3].text, 'CH 1');
  assert.equal(inputs()[1][4].text, 'ON');
  show.model = 'm32';
  assert.equal(inputs()[1][3].text, 'CH 1–2');
});

test('a Yamaha sheet labels stagebox sockets independently from Dante and retains FX assignments', () => {
  const show = fxTestShow('dm7');
  show.stageboxes[0].inputStart = 17;
  show.stageboxes[0].outputStart = 33;
  const [inputs, outputs, fx] = showSheet(show, ['inputs','outputs','fx']);
  const row = inputs.tables[0].rows[0];
  assert.equal(row[0].text, '7–8');
  assert.equal(row[0].detail, 'Dante 23–24');
  assert.equal(row[3].text, 'CH 3–4');
  assert.equal(outputs.tables[0].rows[0][0].detail, 'Dante 33–34');
  assert.equal(fx.tables[0].rows[0][2].text, 'MIX 1 / 2 → CH 5–6');
  assert.equal(fx.tables[0].rows.find(row => row[0].text === 'FX 5')[3].text, 'Bypass');
});

test('the print state keeps event identity and uses the chosen snapshot without recalling it', () => {
  const show = newShow('Show actuel');
  show.venue = 'Scène A';
  const historical = demoShow();
  const state = sheetState(show, {name:'Balance',data:historical});
  assert.equal(state.name, 'Show actuel');
  assert.equal(state.venue, 'Scène A');
  assert.equal(state.channels.length, historical.channels.length);
  assert.equal(show.channels.length, 0);
});

test('stage links follow patch IDs across renumbering and flag missing links', () => {
  const show = fxTestShow('dm7');
  const input = show.channels[1], output = show.outputs[0];
  show.stagePlan = [{
    id:'keys', kind:'keys', name:'', x:50, y:30,
    links:[{direction:'in',id:input.id},{direction:'out',id:output.id}]
  }];
  const plan = () => stagePlot(stageItems(show), stagePatch(show), String);
  assert.match(plan(), /KEYS ST/);
  const linked = showSheet(show, ['inputs','outputs'], stageAnnotations(stageItems(show), stagePatch(show)));
  assert.deepEqual(linked[0].tables[0].rows[0][1].annotations, [{kind:'keys',name:input.name,direction:'in'}]);
  assert.deepEqual(linked[1].tables[0].rows[0][1].annotations, [{kind:'keys',name:input.name,direction:'out'}]);
  assert.equal(showSheet(show, ['inputs'])[0].tables[0].rows[0][1].annotations, undefined);
  input.n = 15;
  input.name = 'Piano jardin';
  assert.match(plan(), /CH 15–16/);
  assert.match(plan(), /Piano jardin/);
  show.channels[1] = channel(15, {name:'Nouvelle source'});
  assert.match(plan(), /CH \?/);
  assert.equal(stageAnnotations(stageItems(show), stagePatch(show)).in.size, 0);
});

test('the plan groups consecutive patch numbers and keeps the chosen order within each direction', () => {
  const show = demoShow(), patch = stagePatch(show);
  const [first, second, third] = show.channels;
  const [left,right] = show.outputs;
  const links = [
    {direction:'in',id:first.id}, {direction:'out',id:left.id}, {direction:'in',id:second.id},
    {direction:'in',id:third.id}, {direction:'out',id:right.id}
  ];
  const item = {id:'kit',kind:'drums',x:50,y:30,links};
  const render = () => stagePlot([item], patch, String);
  assert.match(render(), /Batterie.*CH 1–3.*Bus 1–2/);
  item.links = reorderStageLinks(links, `in:${third.id}`, `in:${first.id}`);
  assert.match(render(), /CH 3, 1–2.*Bus 1–2/);
  item.links = reorderStageLinks(item.links, `out:${right.id}`, `out:${left.id}`);
  assert.match(render(), /CH 3, 1–2.*Bus 2, 1/);
  assert.equal(reorderStageLinks(item.links, `in:${first.id}`, `out:${left.id}`), item.links);
});

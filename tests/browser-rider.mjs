// Real multi-discipline rider regression. Pass the original PDF path as the first argument.
// No copy of the supplied PDF or its contact pages is written into the repository.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const riderPath=process.argv[2];if(!riderPath)throw new Error('Provide the theatre rider PDF path.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.CHICKENWING_TEST_URL||'http://127.0.0.1:4173';
const output=path.join(root,'output/playwright');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),external=[],errors=[];
await context.route('**/*',route=>{const url=new URL(route.request().url());if(['localhost','127.0.0.1'].includes(url.hostname)||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base);await page.locator('[data-action="import"]').waitFor();
 const bytes=await fs.readFile(riderPath);
 const summary=await page.evaluate(async({base64,name})=>{
  const {readRiderDocument}=await import('/src/rider-reader.js'),{parseRiderDocument}=await import('/src/importer.js'),{newShow}=await import('/src/core.js'),{planRiderImport}=await import('/src/import-plan.js');
  const doc=await readRiderDocument(new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],name));
  const r=parseRiderDocument(doc),p=planRiderImport(newShow(),r,{target:'new',name:'Spectacle test · Patch son',model:'wing',bank:'A',outBank:'A'});
  return {selected:r.selectedIds,counts:r.analysis.map(s=>({page:s.label,in:s.inputCount,out:s.outputCount})),channels:p.show.channels.map(c=>({name:c.name,mic:c.mic,bank:c.bank,input:c.input,phantom:c.phantom})),outputs:p.show.outputs.map(o=>({name:o.name,bank:o.bank,port:o.port,bus:o.bus})),errors:p.errors,warnings:r.warnings,raw:r.raw,consoles:r.context.consoles};
 },{base64:bytes.toString('base64'),name:path.basename(riderPath)});
 console.log(JSON.stringify(summary,null,2));
 assert.deepEqual(summary.selected,['page-3']);assert.equal(summary.channels.length,12);assert.equal(summary.outputs.length,10);assert.deepEqual(summary.errors,[]);
 assert.deepEqual(summary.channels.map(c=>[c.bank,c.input]),[['A',1],['A',2],['A',3],['A',4],['A',5],['A',6],['A',7],['LCL',1],['LCL',2],['LCL',3],['LCL',4],['LCL',8]]);
 assert.deepEqual(summary.outputs.map(o=>[o.bank,o.port]),[['A',1],['A',2],['A',3],['A',4],['A',5],['LCL',1],['LCL',2],['LCL',3],['LCL',4],['LCL',5]]);
 assert.equal(summary.channels[0].mic,'DPA 4066');assert.equal(summary.channels[2].mic,'Shure Axient AD2 Micro Main caps B58');assert.equal(summary.channels[4].mic,'Neumann KM 184');assert.equal(summary.channels[11].mic,'Shure SM58');
 assert.ok(!/GrandMA|régisseur|Sunstrip|Ventilateur|MDG|logistique|lumi[eè]re|éclairage/i.test(summary.raw));
 await page.locator('[data-action="import"]').click();await page.locator('#rider-file').setInputFiles(riderPath);await page.locator('[data-action="confirm-import"]').waitFor({timeout:120000});
 assert.equal(await page.locator('.import-edit-table').first().locator('tbody tr').count(),12);assert.equal(await page.locator('.import-edit-table').last().locator('tbody tr').count(),10);
 assert.equal(await page.locator('[data-import-section]:checked').count(),1);assert.ok(await page.locator('[data-import-section="page-3"]').isChecked());
 assert.ok((await page.locator('.modal-body').innerText()).includes('Yamaha DM7'));assert.ok((await page.locator('.modal-body').innerText()).includes('RIO est identifié comme une stagebox'));
 await page.locator('[data-import-option="name"]').fill('Spectacle test · Patch son');await page.locator('[data-import-option="name"]').press('Tab');
 // The user confirmed that the second DPA is a spare; this is a per-show correction, not a guessing rule.
 await page.locator('[data-import-row][data-key="spare"]').nth(1).check();assert.equal(await page.locator('[data-import-row][data-key="name"]').nth(1).inputValue(),'DPA 2 · Spare');assert.ok(!(await page.locator('#import-reading-warnings').innerText()).includes('2 entrées actives'));
 // Changing the stagebox mapping must leave console-local ports untouched.
 await page.locator('[data-import-option="bank"]').selectOption('B');assert.ok((await page.locator('#import-assignments').innerText()).includes('AES50 B'));
 await page.locator('[data-import-option="bank"]').selectOption('A');
 await page.screenshot({path:path.join(output,'rider-theatre-preview.png')});
 await page.locator('.import-edit-table').last().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'rider-theatre-outputs.png')});
 await page.locator('[data-action="confirm-import"]').click();await page.locator('.title-line h1').filter({hasText:'Spectacle test'}).waitFor();
 assert.equal(await page.locator('.patch-table tbody tr').count(),12);await page.locator('#save-state').filter({hasText:'Enregistré en local'}).waitFor();
 await page.locator('[data-action="export"]').click();const pending=page.waitForEvent('download');await page.locator('[data-action="download-project"]').click();const download=await pending;
 const artifacts=path.join(root,'output/imports');await fs.mkdir(artifacts,{recursive:true});const filename=path.join(artifacts,'Spectacle-test-patch-son.chickenwing.json');await download.saveAs(filename);
 const project=JSON.parse(await fs.readFile(filename,'utf8'));assert.equal(project.show.channels.length,12);assert.equal(project.show.outputs.length,10);assert.equal(project.show.channels[1].name,'DPA 2 · Spare');assert.equal(project.show.channels[1].spare,true);assert.equal(project.show.channels[1].input,2);assert.ok(project.show.channels.every(c=>!c.reviewed&&c.mute&&c.fader===-144));
 await page.locator('[data-action="close-modal"]').first().click();await page.reload();await page.locator('.title-line h1').filter({hasText:'Spectacle test'}).waitFor();assert.equal(await page.locator('.patch-table tbody tr').count(),12);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('PASS: original 11-page rider; only page 3 selected; 12 inputs, 10 outputs; RIO vs Local, microphone provenance, saved project and reload; no external requests.');
}catch(error){await page.screenshot({path:path.join(output,'rider-failure.png'),fullPage:true});console.error('Browser errors:',errors);throw error;}finally{await browser.close();}

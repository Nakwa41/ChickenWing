// Real low-resolution ruled patch regression; provide the original PNG path.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const imagePath=process.argv[2];if(!imagePath)throw new Error('Provide the ruled rider PNG path.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=process.env.CHICKENWING_TEST_URL||'http://127.0.0.1:4173';
const output=path.join(root,'output/playwright');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),external=[],errors=[];
await context.route('**/*',r=>{const url=new URL(r.request().url());if(['127.0.0.1','localhost'].includes(url.hostname)||['blob:','data:'].includes(url.protocol))return r.continue();external.push(url.href);return r.abort();});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.locator('[data-action="import"]').waitFor();
 await page.locator('[data-action="import"]').click();await page.locator('#rider-file').setInputFiles(imagePath);await page.locator('[data-action="confirm-import"]').waitFor({timeout:120000});
 assert.equal(await page.locator('.import-edit-table tbody tr').count(),14);
 const ns=await page.locator('[data-import-row][data-key="n"]').evaluateAll(els=>els.map(el=>Number(el.value)));assert.deepEqual(ns,Array.from({length:14},(_,i)=>i+1));
 const mics=await page.locator('[data-import-row][data-key="mic"]').evaluateAll(els=>els.map(el=>el.value));assert.equal(mics[0],'B91');assert.equal(mics[1],'B52');assert.equal(mics[5],'SM81, KM184');assert.equal(mics[7],'Radial, BSS');assert.ok(mics[10].includes('421'));assert.equal(mics[12],'XLR');
 const names=await page.locator('[data-import-row][data-key="name"]').evaluateAll(els=>els.map(el=>el.value));assert.equal(names[0],'BD in');assert.ok(names[13].includes('Lead'));assert.ok(!names.some(n=>/VIDEO|MONITOR|CIRCUIT|NEEDED|DRUMS.*1.?7/i.test(n)));
 await page.locator('[data-import-option="name"]').fill('Patch 14 voies · Image');await page.locator('[data-import-option="name"]').press('Tab');
 await page.locator('.import-edit-table').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'rider-image-preview.png')});
 await page.locator('[data-action="confirm-import"]').click();await page.locator('.title-line h1').filter({hasText:'Patch 14 voies'}).waitFor();assert.equal(await page.locator('.patch-table tbody tr').count(),14);
 await page.locator('#save-state').filter({hasText:'Enregistré en local'}).waitFor();await page.reload();await page.locator('.title-line h1').filter({hasText:'Patch 14 voies'}).waitFor();assert.equal(await page.locator('.patch-table tbody tr').count(),14);
 await page.locator('[data-action="export"]').click();const pending=page.waitForEvent('download');await page.locator('[data-action="download-project"]').click();const download=await pending;
 const destination=path.join(root,'output/imports/Patch-14-voies-image.chickenwing.json');await fs.mkdir(path.dirname(destination),{recursive:true});await download.saveAs(destination);
 const project=JSON.parse(await fs.readFile(destination,'utf8')),channels=project.show.channels;assert.equal(channels.length,14);assert.equal(project.show.outputs.length,0);assert.equal(project.show.fx.length,0);
 assert.deepEqual(channels.filter(c=>c.importMeta.insert==='COMP').map(c=>c.n),[1,2,3,8,9,10,11,14]);assert.equal(channels[4].importMeta.insert,'GATE');assert.equal(channels[5].phantom,false);assert.ok(channels.every(c=>!c.reviewed&&c.mute));
 // Reuse the same OCR worker on a borderless image: per-cell PSM/whitelist must not leak.
 const other=await fs.readFile(path.join(root,'tests/fixtures/rider-image.png'));
 const count=await page.evaluate(async base64=>{const {readRiderDocument}=await import('/src/rider-reader.js'),{parseRiderDocument}=await import('/src/importer.js');const doc=await readRiderDocument(new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],'borderless.png'));return parseRiderDocument(doc).channels.length;},other.toString('base64'));assert.equal(count,3);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({inputs:channels.length,numbers:channels.map(c=>c.n),md421:channels[10].mic,gate:channels[4].importMeta.insert,compressors:channels.filter(c=>c.importMeta.insert==='COMP').map(c=>c.n),warnings:project.show.files[0].warnings,externalRequests:external.length}));
 console.log('PASS: original low-resolution ruled image; 14 ordered channels; MD421, alternatives, insert notes; stage plot/video excluded; save/reload/project export; worker reused; no external requests.');
}catch(error){await page.screenshot({path:path.join(output,'rider-image-failure.png'),fullPage:true});console.error('Browser errors:',errors);throw error;}finally{await browser.close();}

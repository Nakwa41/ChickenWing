// Run against python3 server.py. Requires Playwright and a local Chrome installation.
// PLAYWRIGHT_MODULE can point to an already installed Playwright package entry point.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
const external=[],errors=[];
await context.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol))return route.continue();
 external.push(u.href);return route.abort();
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const output=path.join(root,'output/playwright');await fs.mkdir(output,{recursive:true});
try{
 await page.goto(process.env.CHICKENWING_TEST_URL||'http://127.0.0.1:4173');await page.locator('[data-action="import"]').waitFor();
 const workbook=await page.evaluate(()=>{
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['CH','Source','Micro','Mode'],[1,'Kick In','SM57','M'],[2,'Overhead','KM184','M'],[3,'Keys','Radial ProD2','ST']]),'Patch');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['CH','Source','Micro'],[1,'Alternate Vocal','SM58']]),'Alternative');
  return Array.from(new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'})));
 });
 const excelFile={name:'rider-multisheet.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(workbook)};
 for(const [name,expected] of [['rider-table.pdf',3],['rider-image.png',3],['rider-scan.pdf',3],['rider-multisheet.xlsx',4]]){
  const buffer=name===excelFile.name?excelFile.buffer:await fs.readFile(path.join(root,'tests/fixtures',name));
  const result=await page.evaluate(async({name,base64})=>{
   const {readRiderDocument}=await import(new URL('src/rider-reader.js',document.baseURI)),{parseRider}=await import(new URL('src/importer.js',document.baseURI));
   const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
   const doc=await readRiderDocument(new File([bytes],name));
   return {...doc,channels:doc.sections.flatMap(s=>parseRider(s.text).channels).map(c=>({name:c.name,mic:c.mic,phantom:c.phantom}))};
  },{name,base64:buffer.toString('base64')});
  console.log(JSON.stringify({file:name,channels:result.channels,sections:result.sections.map(s=>({label:s.label,method:s.method,text:s.text})),warnings:result.warnings}));
  assert.equal(result.channels.length,expected,name);assert.equal(result.channels[0].mic,'Shure SM57',name);assert.equal(result.channels[1].phantom,true,name);if(name!=='rider-multisheet.xlsx')assert.equal(result.channels[2].phantom,false,'Explicit OCR phantom off');
 }
 await page.locator('[data-action="import"]').click();await page.locator('#rider-file').setInputFiles(excelFile);
 await page.locator('[data-action="confirm-import"]').waitFor({timeout:30000});
 assert.equal(await page.locator('.import-edit-table tbody tr').count(),3);
 await page.locator('[data-import-section="sheet-1"]').check();assert.equal(await page.locator('.import-edit-table tbody tr').count(),4);assert.ok(await page.locator('[data-action="confirm-import"]').isDisabled());
 await page.locator('[data-import-section="sheet-1"]').uncheck();
 assert.ok((await page.locator('[data-import-power]').nth(1).innerText()).includes('ON'));await page.locator('[data-import-row][data-key="phantom"]').nth(1).selectOption('non');assert.ok((await page.locator('[data-import-power]').nth(1).innerText()).includes('OFF'));
 await page.locator('[data-import-option="name"]').fill('Import browser verification');await page.locator('[data-import-option="name"]').press('Tab');
 await page.locator('[data-console-brand]').selectOption('midas');
 assert.equal(await page.locator('[data-console-family]').inputValue(),'m32');
 assert.deepEqual(await page.locator('[data-console-model] option').evaluateAll(options=>options.map(o=>o.value)),['m32','m32r']);
 await page.locator('[data-import-option="model"]').selectOption('m32');await page.locator('[data-import-option="free"]').check();
 await page.locator('[data-import-row][data-key="name"]').first().fill('Kick corrected');await page.locator('[data-import-row][data-key="name"]').first().press('Tab');
 await page.screenshot({path:path.join(output,'import-preview.png'),fullPage:true});
 await page.locator('[data-action="confirm-import"]').click();await page.locator('.title-line h1').filter({hasText:'Import browser verification'}).waitFor();
 assert.equal(await page.locator('.patch-table tbody tr').count(),3);assert.ok((await page.locator('.patch-table').innerText()).includes('Kick corrected'));
 await page.locator('#save-state').filter({hasText:'Enregistré en local'}).waitFor();
 await page.reload();await page.locator('.title-line h1').filter({hasText:'Import browser verification'}).waitFor();
 // Append allocates around existing pairs; undo restores the prior show.
 await page.locator('[data-action="import"]').click();await page.locator('#paste-patch').fill('CH;Source;Micro\n1;New Vocal;SM58');await page.locator('[data-action="parse-paste"]').click();
 await page.locator('[data-import-option="target"]').selectOption('append');await page.locator('[data-action="confirm-import"]').click();
 assert.equal(await page.locator('.patch-table tbody tr').count(),4);await page.locator('[data-action="undo"]').click();assert.equal(await page.locator('.patch-table tbody tr').count(),3);
 // Unusual columns can be mapped and excluded without leaving the preview.
 await page.locator('[data-action="import"]').click();await page.locator('#paste-patch').fill('Model;Instrument label\nSM57;Guitar');await page.locator('[data-action="parse-paste"]').click();
 await page.getByText('Régler la lecture des colonnes',{exact:true}).click();await page.locator('[data-import-map="name"]').selectOption('1');await page.locator('[data-import-map="mic"]').selectOption('0');await page.locator('#import-start-row').fill('2');await page.locator('[data-action="import-map"]').click();assert.equal(await page.locator('.import-edit-table tbody tr').count(),1);
 await page.locator('[data-import-row][data-key="include"]').uncheck();assert.ok(await page.locator('[data-action="confirm-import"]').isDisabled());await page.locator('[data-action="close-modal"]').click();
 // Wizard identity flows into import.
 await page.locator('[data-action="wizard"]').first().click();await page.locator('#wizard-form [name="name"]').fill('Wizard import');await page.locator('[data-action="wizard-next"]').click();await page.locator('[data-action="wizard-import"]').click();
 await page.locator('#paste-patch').fill('1 Lead SM58');await page.locator('[data-action="parse-paste"]').click();assert.equal(await page.locator('[data-import-option="name"]').inputValue(),'Wizard import');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.querySelector('#toasts').replaceChildren());await page.screenshot({path:path.join(output,'import-mobile.png')});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No global mobile overflow');
 assert.deepEqual(external,[],'No external requests, even with a fresh browser profile');assert.deepEqual(errors,[],'No browser runtime errors');
 console.log('PASS: local PDF, scan, image, Excel; editable preview, M32, append/undo, persistence, mapping, exclusions, wizard, mobile; no external requests.');
}catch(error){await page.screenshot({path:path.join(output,'import-failure.png'),fullPage:true});console.error('Browser errors:',errors);throw error;}finally{await browser.close();}

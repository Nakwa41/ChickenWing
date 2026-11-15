import {parseRider,parseRiderDocument,detectColumns} from './importer.js';
import {riderHeading} from './rider-context.js';
import {detectTableGrids,gridCell} from './rider-grid.js';

const vendorUrl=new URL('../public/vendor/',import.meta.url);

// Rebuild rows from coordinates instead of flattening a PDF/OCR into a prose paragraph.
export function layoutText(words,state={}){
 const lines=[];
 for(const word of words.filter(w=>w.text?.trim())){
  const tolerance=Math.max(3,Math.min(word.height||10,20)*.4);
  let line=lines.find(l=>Math.abs(l.y-word.y)<tolerance);
  if(!line){line={y:word.y,words:[]};lines.push(line);}line.words.push(word);
 }
 const rows=lines.sort((a,b)=>a.y-b.y).map(line=>{
  const cells=[];
  for(const w of line.words.sort((a,b)=>a.x-b.x)){
   const prev=cells.at(-1),charWidth=w.width/Math.max(w.text.length,1);
   if(prev&&w.x-prev.end<Math.max(9,charWidth*1.8)){
    const gap=w.x-prev.end;prev.text+=(gap>charWidth*.2?' ':'')+w.text;prev.end=Math.max(prev.end,w.x+w.width);
   }else cells.push({x:w.x,end:w.x+w.width,text:w.text});
  }return cells;
 });
 let columns=state.columns||null;
 return rows.map(cells=>{
  if(detectColumns([cells.map(c=>c.text)]).mapping){columns=cells.map(c=>c.x);state.columns=columns;}
  if(!columns||cells[0]?.x<columns[0]-15)return cells.map(c=>c.text).join('\t');
  const row=columns.map(()=>'');
  for(const cell of cells){let index=0;for(let i=1;i<columns.length;i++)if(cell.x>=columns[i]-Math.min(12,(columns[i]-columns[i-1])*.15))index=i;row[index]+=(row[index]?' ':'')+cell.text;}
  return row.join('\t');
 }).join('\n');
}
async function imageSurface(image){
 let bitmap;
 try{
  const source=image instanceof HTMLCanvasElement?image:(bitmap=await createImageBitmap(image));
  const scale=Math.min(1,2200/Math.max(source.width,source.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);
  return canvas;
 }catch{return null;}finally{bitmap?.close();}
}
function enlargedCrop(source,rect,requestedScale){
 const canvas=document.createElement('canvas'),padding=12,scale=requestedScale?Math.min(requestedScale,Math.max(1,1600/rect.width)):Math.min(5,Math.max(1,60/rect.height));
 canvas.width=Math.ceil(rect.width*scale)+padding*2;canvas.height=Math.ceil(rect.height*scale)+padding*2;
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,rect.x,rect.y,rect.width,rect.height,padding,padding,rect.width*scale,rect.height*scale);return canvas;
}
function inkBounds(ctx,rect){
 const {data}=ctx.getImageData(rect.x,rect.y,rect.width,rect.height);let count=0,left=rect.width,right=0,top=rect.height,bottom=0;
 for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){const i=(y*rect.width+x)*4;if(data[i]+data[i+1]+data[i+2]<630){count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
 if(count<4)return null;
 const x=Math.max(0,left-1),y=Math.max(0,top-1);
 return {x:rect.x+x,y:rect.y+y,width:Math.min(rect.width,right+2)-x,height:Math.min(rect.height,bottom+2)-y};
}
const tsvRow=row=>row.map(v=>/["\t\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v).join('\t');
async function recognizeGrids(worker,surface,progress){
 const ctx=surface.getContext('2d',{willReadFrequently:true}),grids=detectTableGrids(ctx.getImageData(0,0,surface.width,surface.height)),texts=[],confidences=[],warnings=[];
 for(let g=0;g<grids.length;g++){
  const grid=grids[g],rowCount=grid.ys.length-1,colCount=grid.xs.length-1;
  if(rowCount>200||rowCount*colCount>1200)continue;
  const rows=[];let header=null,headerIndex=-1;
  const readCell=async(row,col,numeric=false,microphone=false,channel='')=>{
   const rect=inkBounds(ctx,gridCell(grid,row,col));if(!rect)return '';
   const crop=enlargedCrop(surface,rect);
   try{
    const params={tessedit_pageseg_mode:numeric?'8':'7',...(numeric?{tessedit_char_whitelist:'0123456789'}:{})};
    let {data}=await worker.recognize(crop,params,{text:true});
    if(microphone&&(data.confidence<70||/@/.test(data.text||''))){
     for(const mode of ['13','8']){
      const retry=await worker.recognize(crop,{tessedit_pageseg_mode:mode,tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ,.+/()-&'},{text:true});
      if(retry.data.text?.trim()&&retry.data.confidence>data.confidence)data=retry.data;
     }
    }
    if(!numeric&&data.confidence<70){
     const binary=enlargedCrop(surface,rect,6),ctx=binary.getContext('2d'),pixels=ctx.getImageData(0,0,binary.width,binary.height);
     for(let i=0;i<pixels.data.length;i+=4){const value=pixels.data[i]<170?0:255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;}ctx.putImageData(pixels,0,0);
     try{const retry=await worker.recognize(binary,{tessedit_pageseg_mode:'7',...(microphone?{tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ,.+/()-&'}:{})},{text:true});if(retry.data.text?.trim()&&retry.data.confidence>data.confidence)data=retry.data;}finally{binary.width=binary.height=0;}
    }
    const text=(data.text||'').replace(/\s+/g,' ').trim();if(text)confidences.push(data.confidence);
    if(text&&data.confidence<70)warnings.push(`Tableau ${g+1} · ${channel?'CH '+channel:'ligne '+(row+1)} · ${header?.header[col]||'colonne '+(col+1)} : « ${text} » à vérifier (OCR ${Math.round(data.confidence)} %).`);
    return text;
   }finally{crop.width=crop.height=0;}
  };
  // Validate actual audio column headers before reading any data cells.
  for(let row=0;row<Math.min(3,rowCount);row++){
   progress(`Lecture du tableau ${g+1} · en-têtes…`);const cells=[];
   for(let col=0;col<colCount;col++)cells.push(await readCell(row,col));
   const detected=detectColumns([cells]);if(detected.mapping){header=detected;headerIndex=row;rows.push(cells);break;}
  }
  if(!header)continue;
  for(let row=headerIndex+1;row<rowCount;row++){
   progress(`Lecture du tableau ${g+1} · ligne ${row-headerIndex}/${rowCount-headerIndex-1}`);const cells=[];
   for(let col=0;col<colCount;col++)cells.push(await readCell(row,col,col===header.mapping.n,col===header.mapping.mic,cells[header.mapping.n]));rows.push(cells);
  }
  // Retain the heading above this table, so a lighting table cannot lose its context.
  const top=g?grids[g-1].bottom:0,height=Math.floor(grid.top-top-3);let heading='';
  if(height>8){
   const crop=enlargedCrop(surface,{x:0,y:Math.ceil(top),width:surface.width,height});
   try{const {data}=await worker.recognize(crop,{tessedit_pageseg_mode:'6'},{text:true});heading=data.text||'';}finally{crop.width=crop.height=0;}
  }
  const tableText=heading.trim()+'\n'+rows.map(tsvRow).join('\n'),parsed=parseRider(tableText);
  if(parsed.channels.length||parsed.outputs.length)texts.push(tableText);
 }
 return texts.length?{text:texts.join('\n'),confidence:confidences.reduce((n,v)=>n+v,0)/confidences.length,warnings,method:'OCR local · cellules du tableau'}:null;
}
let workerPromise,reportProgress=()=>{};
async function ocr(image,progress){
 reportProgress=progress;progress('Initialisation de l’OCR local français / anglais…');let surface;
 if(!globalThis.Tesseract)throw new Error('Le moteur OCR local est absent. Vérifiez le dossier public/vendor.');
 try{
  workerPromise??=globalThis.Tesseract.createWorker('eng+fra',1,{
   workerPath:new URL('tesseract.js/dist/worker.min.js',vendorUrl).href,
   corePath:new URL('tesseract.js-core',vendorUrl).href,
   langPath:vendorUrl.href,workerBlobURL:false,
   logger:m=>{if(m.status==='recognizing text')reportProgress(`Lecture de l’image · ${Math.round(m.progress*100)} %`);}
  });
  const worker=await workerPromise;surface=await imageSurface(image);
  if(surface){
   reportProgress=()=>{};const table=await recognizeGrids(worker,surface,progress);reportProgress=progress;if(table)return table;
  }
  let input=surface||image,enlarged;
  if(surface&&surface.width<1400){const scale=Math.min(3,1400/surface.width,Math.sqrt(6000000/(surface.width*surface.height)));if(scale>1){enlarged=document.createElement('canvas');enlarged.width=Math.round(surface.width*scale);enlarged.height=Math.round(surface.height*scale);const ctx=enlarged.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(surface,0,0,enlarged.width,enlarged.height);input=enlarged;}}
  try{
   const {data}=await worker.recognize(input,{}, {text:true,blocks:true});
   const words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[]))).map(w=>({text:w.text,x:w.bbox.x0,y:w.bbox.y1,width:w.bbox.x1-w.bbox.x0,height:w.bbox.y1-w.bbox.y0}));
   return {text:words.length?layoutText(words):data.text,confidence:data.confidence};
  }finally{if(enlarged)enlarged.width=enlarged.height=0;}
 }catch(error){
  if(workerPromise){try{(await workerPromise).terminate();}catch{}workerPromise=null;}
  throw new Error(`Lecture OCR impossible. Essayez une image PNG/JPEG plus nette. ${error.message||''}`);
 }finally{if(surface)surface.width=surface.height=0;reportProgress=()=>{};}
}
export async function readRiderDocument(file,progress=()=>{}){
 if(file.size>35*1024*1024)throw new Error('Ce document dépasse 35 Mo. Importez une version plus légère.');
 const ext=file.name.split('.').pop().toLowerCase(),sections=[],warnings=[];
 if(['csv','tsv','txt'].includes(ext)){
  const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);
  const encoding=bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8';
  let text=new TextDecoder(encoding).decode(buffer);if(text.includes('\uFFFD'))text=new TextDecoder('windows-1252').decode(buffer);
  sections.push({id:'text',label:file.name,text});
 }else if(['xlsx','xls','ods'].includes(ext)){
  progress('Lecture locale du classeur…');
  if(!globalThis.XLSX)throw new Error('Le lecteur Excel local est absent. Vérifiez le dossier public/vendor.');
  const wb=globalThis.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
  for(const [index,name] of wb.SheetNames.entries()){
   const rows=globalThis.XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false,blankrows:false});
   if(rows.length>10000)throw new Error('Une feuille dépasse 10 000 lignes. Exportez uniquement le tableau du patch.');
   if(rows.length)sections.push({id:`sheet-${index}`,label:name,text:globalThis.XLSX.utils.sheet_to_csv(wb.Sheets[name],{FS:'\t',blankrows:false})});
  }
 }else if(ext==='pdf'){
  progress('Ouverture locale du PDF…');
  const pdfjs=await import('../public/vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.mjs',vendorUrl).href;
  const layoutState={};
  const pdf=await pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false,useSystemFonts:true}).promise;
  try{
   if(pdf.numPages>30)throw new Error('Le PDF dépasse 30 pages. Séparez les pages du patch avant import.');
   for(let i=1;i<=pdf.numPages;i++){
    progress(`Lecture du PDF · page ${i}/${pdf.numPages}`);
    const page=await pdf.getPage(i),content=await page.getTextContent(),viewport=page.getViewport({scale:1});
    let text=layoutText(content.items.filter(x=>x.str).map(item=>{
     const t=pdfjs.Util.transform(viewport.transform,item.transform);
     return {text:item.str,x:t[4],y:t[5],width:item.width,height:item.height};
    }),layoutState),method='Texte PDF',confidence;
    const parsed=parseRider(text);
    let scan=text.trim().length<20;
    if(!scan&&!parsed.channels.length&&!parsed.outputs.length){
     const excluded=text.split('\n').some(line=>riderHeading(line)==='other');
     if(!excluded&&(text.trim().length<200||/\b(patch|input list|channel list)\b/i.test(text))){const ops=await page.getOperatorList();scan=ops.fnArray.some(op=>[pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject].includes(op));}
    }
    if(scan){
     const scale=Math.min(2,Math.sqrt(12000000/(viewport.width*viewport.height))),view=page.getViewport({scale});
     const canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
     try{await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;const result=await ocr(canvas,msg=>progress(`Page ${i}/${pdf.numPages} · ${msg}`));text=result.text;confidence=result.confidence;method=result.method||'OCR local';warnings.push(...(result.warnings||[]).map(w=>`Page ${i} · ${w}`));}
     finally{canvas.width=canvas.height=0;}
    }
    sections.push({id:`page-${i}`,label:`Page ${i}`,text,method,confidence});page.cleanup();
   }
  }finally{await pdf.destroy();}
 }else if(['png','jpg','jpeg','webp','bmp','tiff','tif'].includes(ext)){
  const result=await ocr(file,progress);sections.push({id:'image',label:file.name,method:'OCR local',...result});warnings.push(...(result.warnings||[]));
 }else throw new Error('Format non reconnu. Utilisez PDF, image, Excel, ODS, CSV, TSV ou TXT.');
 if(!sections.some(s=>s.text?.trim()))throw new Error('Aucun texte lisible trouvé. Essayez un document plus net ou collez le texte du patch.');
 for(const s of sections)if(s.confidence!==undefined&&s.confidence<70)warnings.push(`${s.label} : lecture OCR incertaine (${Math.round(s.confidence)} %). Vérifiez chaque valeur.`);
 return {filename:file.name,sections,warnings};
}
// Compatibility for callers that only need a single parsed patch.
export async function readRider(file,progress){
 const doc=await readRiderDocument(file,progress);return {...parseRiderDocument(doc),sections:doc.sections};
}

let db;
export async function openDB(){
  if(db)return db;
  db=await new Promise((resolve,reject)=>{const req=indexedDB.open('chickenwing-workspace',1);req.onupgradeneeded=()=>req.result.createObjectStore('workspace');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return db;
}
export async function readWorkspace(){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('workspace').objectStore('workspace').get('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function writeWorkspace(value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(value,'state');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Sauvegarde interrompue'));});}

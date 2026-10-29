// Account-scoped IndexedDB snapshots. OAuth credentials never enter this store.
const DATABASE='dip-workspace-v1',STORE='snapshots';
let database;
async function db(){
 if(typeof indexedDB==='undefined')return null;
 if(!database)database=new Promise((resolve,reject)=>{const r=indexedDB.open(DATABASE,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return database;
}
export function cacheKey(user,repo,branch){return JSON.stringify([String(user),repo,branch]);}
export function reconcileFiles(files,cached={}){
 const retained={},missing=[];
 for(const f of files){const old=cached[f.path];if(old?.sha===f.sha&&old.event)retained[f.path]=old;else missing.push(f);}
 return {retained,missing};
}
export function fileBatches(files){const batches=[];let batch=[],bytes=0;for(const f of files){const size=Math.min(f.size||0,1048576);if(batch.length&&(batch.length>=32||bytes+size>4194304)){batches.push(batch);batch=[];bytes=0;}batch.push(f);bytes+=size;}if(batch.length)batches.push(batch);return batches;}
export const workspaceCache={
 async get(key){const d=await db();if(!d)return null;return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});},
 async put(key,value){const d=await db();if(!d)throw Error('Browser storage unavailable');return new Promise((resolve,reject)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(value,key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});},
 async purge(user){const d=await db();if(!d)return;return new Promise((resolve,reject)=>{const t=d.transaction(STORE,'readwrite'),r=t.objectStore(STORE).openCursor();r.onsuccess=()=>{const cursor=r.result;if(cursor){try{if(JSON.parse(cursor.key)[0]===String(user))cursor.delete();}catch{}cursor.continue();}};t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
};

// Populate the session map even when an IndexedDB snapshot is still fresh.
// Both manual sync and post-edit sync must reuse this restored snapshot.
export async function readCachedSnapshot(key,memory,storage=workspaceCache){
 if(memory.has(key))return memory.get(key);
 const snapshot=await storage.get(key);
 if(snapshot)memory.set(key,snapshot);
 return snapshot;
}

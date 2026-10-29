import test from 'node:test';
import assert from 'node:assert/strict';
import {cacheKey,reconcileFiles,fileBatches,readCachedSnapshot} from '../lib/workspace-cache.mjs';
test('project cache keys isolate accounts, repositories and branches',()=>{const keys=[cacheKey('1','org/a','main'),cacheKey('2','org/a','main'),cacheKey('1','org/b','main'),cacheKey('1','org/a','dev')];assert.equal(new Set(keys).size,4);assert.deepEqual(JSON.parse(keys[0]),['1','org/a','main']);});
test('delta keeps unchanged blobs, fetches changed and missing blobs, drops deleted history',()=>{const event={id:1};const files=[{path:'a',sha:'1'},{path:'b',sha:'3'},{path:'c',sha:'4'}];const d=reconcileFiles(files,{a:{sha:'1',event},b:{sha:'2',event},removed:{sha:'9',event}});assert.deepEqual(Object.keys(d.retained),['a']);assert.deepEqual(d.missing.map(f=>f.path),['b','c']);assert.equal(d.retained.a.event,event);});
test('partial reads retry failed blobs instead of treating missing records as complete',()=>{assert.equal(reconcileFiles([{path:'x',sha:'1'}],{x:{sha:'1',error:'failed'}}).missing.length,1);assert.equal(reconcileFiles([{path:'x',sha:'1'}],{x:{sha:'1',event:{id:1}}}).missing.length,0);});
test('delta batches obey both 32-file and 4 MiB bounds without losing ordering',()=>{const files=Array.from({length:80},(_,i)=>({path:String(i),size:700000}));const batches=fileBatches(files);assert.deepEqual(batches.flat(),files);for(const batch of batches){assert.ok(batch.length<=32);assert.ok(batch.reduce((n,f)=>n+f.size,0)<=4194304);}assert.equal(fileBatches(Array.from({length:33},()=>({size:1}))).length,2);});

test('reload restores IndexedDB snapshot into memory before any sync or task save',async()=>{
 const key=cacheKey('1','org/repo','main'),memory=new Map();
 const snapshot={complete:true,checkedAt:Date.now(),snapshot:{tree:'unchanged'},records:{a:{sha:'1',event:{id:1}}}};let reads=0;
 const storage={async get(k){assert.equal(k,key);reads++;return snapshot;}};
 assert.equal(await readCachedSnapshot(key,memory,storage),snapshot);assert.equal(memory.get(key),snapshot);
 const delta=reconcileFiles([{path:'a',sha:'1'},{path:'b',sha:'2'}],memory.get(key).records);assert.deepEqual(delta.missing.map(f=>f.path),['b']);
 assert.equal(await readCachedSnapshot(key,memory,storage),snapshot);assert.equal(reads,1);
});

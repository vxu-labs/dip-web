import test from 'node:test';
import assert from 'node:assert/strict';
import {eventBatch,github} from '../lib/github.mjs';
import {readJSON} from '../lib/security.mjs';
test('GitHub batch preserves valid events and reports identity mismatches',async()=>{
 const original=globalThis.fetch;
 const event={eventId:'event_a',taskId:'task_a',type:'task.create'};
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.github.com/graphql');
  assert.equal(options.redirect,'manual');
  const body=JSON.parse(options.body);assert.deepEqual(body.variables,{owner:'vxu-labs',name:'dip'});
  return Response.json({data:{repository:{b0:{oid:'a'.repeat(40),text:JSON.stringify(event),byteSize:80,isTruncated:false},b1:{text:JSON.stringify(event),byteSize:80,isTruncated:false}}}});
 };
 try{const r=await eventBatch('test-token','vxu-labs/dip',[{path:'events/task_a/event_a.json',sha:'a'.repeat(40),size:80},{path:'events/task_b/event_b.json',sha:'b'.repeat(40),size:80}]);assert.deepEqual(r[0].event,event);assert.match(r[1].error,/identity/);}finally{globalThis.fetch=original;}
});
test('truncated GitHub event cannot appear as a complete record',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({data:{repository:{b0:{text:'{}',byteSize:2,isTruncated:true}}}});
 try{const r=await eventBatch('test-token','vxu-labs/dip',[{path:'events/task_a/event_a.json',sha:'a'.repeat(40),size:2}]);assert.match(r[0].error,/Incomplete/);}finally{globalThis.fetch=original;}
});
test('streamed JSON input stops at byte bound',async()=>{
 assert.deepEqual(await readJSON(new Request('https://dip.vxu.me',{method:'POST',body:'{"a":1}'})),{a:1});
 await assert.rejects(readJSON(new Request('https://dip.vxu.me',{method:'POST',body:'x'.repeat(16385)})),/16 KB/);
});

test('GitHub redirects are rejected without forwarding credentials',async()=>{
 const original=globalThis.fetch;let requests=0;
 globalThis.fetch=async(url,options)=>{requests++;assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}});};
 try{await assert.rejects(github('test-token','/user'),/GitHub could not complete/);assert.equal(requests,1);}finally{globalThis.fetch=original;}
});

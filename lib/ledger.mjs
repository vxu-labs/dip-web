// Read-only protocol v1 projection, adapted from vxu-labs/dip src/core.js (Apache-2.0).
// No local leases or source-snapshot verification are inferred from GitHub data.
const fields=['title','description','status','kind','resolution','dependencies','scope','priority','due','acceptance','supersedes'];
export function projectEvents(input){
 const errors=[],byTask=new Map(),activity=[],seen=new Set();
 for(const e of input){if(!e||e.schemaVersion!==1||typeof e.eventId!=='string'||typeof e.taskId!=='string'||typeof e.actor!=='string'||typeof e.createdAt!=='string'||!Array.isArray(e.parents)||e.parents.some(p=>typeof p!=='string')||!e.payload||typeof e.payload!=='object'||Array.isArray(e.payload)){errors.push('Invalid event schema');continue;}
 if(seen.has(e.eventId))continue;seen.add(e.eventId);
 if(e.type==='activity.batch'){if(!Array.isArray(e.payload.records)){errors.push('Invalid activity batch');continue;}activity.push(...e.payload.records.filter(r=>r&&typeof r==='object').map(r=>({...r,eventId:e.eventId})));continue;}
 if(!byTask.has(e.taskId))byTask.set(e.taskId,[]);byTask.get(e.taskId).push(e);}
 const tasks=[];
 for(const [id,events] of byTask){try{
 const map=new Map(events.map(e=>[e.eventId,e])),ancestors=new Map(),visiting=new Set();
 const ancestor=(id)=>{if(ancestors.has(id))return ancestors.get(id);if(visiting.has(id))throw Error('Cyclic history');const e=map.get(id);if(!e)throw Error('Missing parent '+id);visiting.add(id);const values=new Set(e.parents);for(const p of e.parents)for(const a of ancestor(p))values.add(a);visiting.delete(id);ancestors.set(id,values);return values;};
 for(const e of events)ancestor(e.eventId);
 const ordered=[...events].sort((a,b)=>ancestors.get(a.eventId).size-ancestors.get(b.eventId).size||a.eventId.localeCompare(b.eventId));
 const task={id,title:'',description:'',acceptance:[],status:'backlog',kind:'work',resolution:null,dependencies:[],scope:[],checkpoints:[],decisions:[],evidence:[],plan:null,documents:[],history:ordered,conflicts:[],verification:'not_rechecked'};const writes=new Map(),documents=new Map();
 for(const e of ordered){if(['task.create','task.update','task.resolve'].includes(e.type))for(const [key,value] of Object.entries(e.payload)){if(!fields.includes(key))continue;const prev=(writes.get(key)||[]).filter(w=>!ancestors.get(e.eventId).has(w.eventId));writes.set(key,[...prev,e]);task[key]=value;}
 if(e.type==='task.checkpoint'&&typeof e.payload.summary==='string'&&(e.payload.next===undefined||typeof e.payload.next==='string'))task.checkpoints.push({...e.payload,at:e.createdAt,actor:e.actor});
 if(e.type==='task.decision')task.decisions.push({...e.payload,at:e.createdAt,actor:e.actor});
 if(e.type==='task.evidence')task.evidence.push({...e.payload,at:e.createdAt});
 if(e.type==='task.plan')task.plan={...e.payload,at:e.createdAt,actor:e.actor};
 if(e.type==='task.document'){const key=JSON.stringify([e.payload.path,e.payload.role]);documents.set(key,[...(documents.get(key)||[]).filter(w=>!ancestors.get(e.eventId).has(w.eventId)),e]);}task.updatedAt=e.createdAt;}
 for(const [field,writers] of writes)if(new Set(writers.map(w=>JSON.stringify(w.payload[field]))).size>1)task.conflicts.push({field,alternatives:writers.map(w=>({eventId:w.eventId,value:w.payload[field],actor:w.actor}))});
 for(const writers of documents.values()){const variants=[...new Map(writers.map(e=>[JSON.stringify([e.payload.removed===true,e.payload.hash]),e])).values()];const current=variants.at(-1);if(variants.length>1||!current.payload.removed)task.documents.push({...current.payload,conflict:variants.length>1});}
 if(task.conflicts.length)task.status='conflict';
 for(const k of ['acceptance','dependencies','scope'])if(!Array.isArray(task[k])||task[k].some(v=>typeof v!=='string'))throw Error('Invalid '+k);
 if(!['work','discussion'].includes(task.kind))throw Error('Invalid task kind');
 if(typeof task.title!=='string'||typeof task.description!=='string'||typeof task.status!=='string')throw Error('Invalid task fields');
 tasks.push(task);
 }catch(e){errors.push(id+': '+e.message);}}
 const recordIds=new Set();return {tasks:tasks.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))),activity:activity.filter(r=>{if(!r.recordId)return true;if(recordIds.has(r.recordId))return false;recordIds.add(r.recordId);return true;}),errors};
}

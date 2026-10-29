import {github,eventBatch} from './github.mjs';
import {projectEvents} from './ledger.mjs';
import {fileBatches} from './workspace-cache.mjs';
const STATES=['backlog','ready','in_progress','blocked','implemented','cancelled'];
export class WriteConflict extends Error{}
export function validatePatch(value,create=false){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid task changes');
 const patch={};
 for(const k of Object.keys(value)){
  const v=value[k];
  if(k==='title'){if(typeof v!=='string'||!v.trim()||v.length>500)throw Error('Use a task title of 1–500 characters');patch.title=v.trim();}
  else if(k==='description'){if(typeof v!=='string'||v.length>8000)throw Error('Description exceeds 8,000 characters');patch.description=v;}
  else if(k==='status'){if(!STATES.includes(v))throw Error('This status requires local DIP verification or conflict resolution');patch.status=v;}
  else if(k==='priority'){if(!Number.isInteger(v)||v<0||v>3)throw Error('Invalid priority');patch.priority=v;}
  else if(k==='due'){if(v!==''&&(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))))throw Error('Invalid due date');patch.due=v;}
  else if(k==='acceptance'){if(!Array.isArray(v)||v.length>50||v.some(a=>typeof a!=='string'||a.length>1000))throw Error('Invalid acceptance criteria');patch.acceptance=v;}
  else throw Error('Unsupported task field');
 }
 if(create&&!patch.title)throw Error('A task needs a title');if(!Object.keys(patch).length)throw Error('No changes to save');
 if(patch.status)patch.resolution=null;
 return patch;
}
export function newTaskEvent(taskId,events,patch,actor,eventId,create=false){
 const referenced=new Set(events.flatMap(e=>e.parents));const parents=events.filter(e=>!referenced.has(e.eventId)).map(e=>e.eventId).sort();
 return {schemaVersion:1,eventId,taskId,type:create?'task.create':'task.update',createdAt:new Date().toISOString(),actor,parents,payload:create?{kind:'work',status:'backlog',description:'',acceptance:[],...patch}:patch};
}
export async function writeTask(user,body){
 const repo=body.repo,branch=body.branch;
 if(typeof branch!=='string'||!branch||branch.length>200||branch.startsWith('/')||branch.endsWith('/')||branch.includes('//')||branch.includes('..')||branch.includes('@{')||/[\s~^:?*\[\\]/.test(branch)||branch.endsWith('.lock'))throw Error('Select a valid branch to save changes');
 if(!/^[a-f0-9]{40}$/.test(body.expectedCommit||''))throw Error('Refresh the project before editing');
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(body.taskId||'')||body.taskId==='_activity'||!/^event_[a-f0-9-]{36}$/.test(body.eventId||''))throw Error('Invalid task identity');
 const create=body.action==='createTask',patch=validatePatch(body.patch,create);
 const {data:info}=await github(user.token,`/repos/${repo}`);if(!info.permissions?.push)throw Error('Your GitHub account needs write access to this repository');
 const {data:ref}=await github(user.token,`/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
 if(ref.object.sha!==body.expectedCommit)throw new WriteConflict('This project changed on GitHub. Sync before saving your changes.');
 const {data:commit}=await github(user.token,`/repos/${repo}/git/commits/${ref.object.sha}`);
 const {data:root}=await github(user.token,`/repos/${repo}/git/trees/${commit.tree.sha}`);
 const dip=root.tree.find(e=>e.path==='.dip'&&e.type==='tree');if(!dip)throw Error('No DIP history on this branch');
 const {data:tree}=await github(user.token,`/repos/${repo}/git/trees/${dip.sha}?recursive=1`);if(tree.truncated)throw Error('Task history is too large for editing');
 const files=tree.tree.filter(f=>f.type==='blob'&&f.path.startsWith(`events/${body.taskId}/`)&&f.path.endsWith('.json'));
 if(create&&files.length)throw new WriteConflict('This task already exists. Sync the project.');if(!create&&!files.length)throw Error('Task no longer exists on this branch');if(files.length>2000)throw Error('Use local DIP to edit this large task history');
 const events=[];for(const batch of fileBatches(files)){for(const x of await eventBatch(user.token,repo,batch)){if(x.error)throw Error('Cannot edit incomplete task history');events.push(x.event);}}
 if(!create){const projection=projectEvents(events);if(projection.errors.length||!projection.tasks.length)throw Error('Cannot edit invalid task history');if(projection.tasks[0].conflicts.length)throw Error('Resolve conflicting task changes with local DIP first');}
 const event={...newTaskEvent(body.taskId,events,patch,`github:${user.login}`,body.eventId,create),branch};
 const {data:blob}=await github(user.token,`/repos/${repo}/git/blobs`,{method:'POST',body:{content:JSON.stringify(event,null,2)+'\n',encoding:'utf-8'}});
 const {data:newTree}=await github(user.token,`/repos/${repo}/git/trees`,{method:'POST',body:{base_tree:commit.tree.sha,tree:[{path:`.dip/events/${body.taskId}/${event.eventId}.json`,mode:'100644',type:'blob',sha:blob.sha}]}});
 const {data:newCommit}=await github(user.token,`/repos/${repo}/git/commits`,{method:'POST',body:{message:`DIP: ${create?'create':'update'} ${String(patch.title||body.taskId).slice(0,100)}`,tree:newTree.sha,parents:[ref.object.sha]}});
 // Non-forced fast-forward rejects a branch changed after our initial read.
 try{await github(user.token,`/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,{method:'PATCH',body:{sha:newCommit.sha,force:false}});}catch(e){if(e.status===422||e.status===409)throw new WriteConflict('Another change reached GitHub first. Sync and retry.');throw e;}
 return {event,commit:newCommit.sha};
}

export class GitHubError extends Error{constructor(status,message,retryAfter){super(message);this.status=status;this.retryAfter=retryAfter;}}
export async function github(token,path,options={}){
 if(!path.startsWith('/')||path.startsWith('//'))throw new Error('Invalid API path');
 const response=await fetch('https://api.github.com'+path,{...(options.query?{method:'POST',body:JSON.stringify({query:options.query,variables:options.variables})}:options.method?{method:options.method,...(options.body?{body:JSON.stringify(options.body)}:{})}:{}),headers:{...(options.query||options.body?{'Content-Type':'application/json'}:{}),Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'VXU-DIP-Dashboard'},signal:AbortSignal.timeout(20000),redirect:'manual'});
 if(!response.ok){const retry=response.headers.get('retry-after')||(response.headers.get('x-ratelimit-remaining')==='0'?String(Math.max(1,Number(response.headers.get('x-ratelimit-reset'))-Math.floor(Date.now()/1000))):null);throw new GitHubError(response.status,response.status===401?'Your GitHub authorization expired. Sign in again.':response.status===404?'Repository or path is unavailable.':response.status===403?(options.method?'GitHub denied this change. Check DIP write permission and branch protection.':'GitHub denied this read. Check repository access or rate limits.'):response.status===429?'GitHub rate limit reached. Try again later.':'GitHub could not complete this read.',retry);}
 const length=Number(response.headers.get('content-length')||0);if(length>16*1024*1024)throw new Error('GitHub response exceeds the read limit');
 const reader=response.body.getReader();let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16*1024*1024){await reader.cancel();throw new Error('GitHub response exceeds the read limit');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return {data:JSON.parse(new TextDecoder().decode(bytes)),next:!!response.headers.get('link')?.includes('rel="next"')};
}
export async function pool(items,fn,concurrency=4){let i=0;const results=new Array(items.length);await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(i<items.length){const at=i++;results[at]=await fn(items[at],at);}}));return results;}
export async function blobJSON(token,repo,sha){const {data}=await github(token,`/repos/${repo}/git/blobs/${sha}`);if(data.size>1024*1024)throw new Error('Ledger event exceeds 1 MB');if(data.encoding!=='base64')throw new Error('Unsupported GitHub blob encoding');return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));}

export async function eventBatch(token,repo,files){
 const valid=files.filter(f=>f.size<=1024*1024);if(!valid.length)return files.map(f=>({path:f.path,error:'Event exceeds 1 MB'}));
 const [owner,name]=repo.split('/');
 const query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){'+valid.map((f,i)=>`b${i}:object(oid:${JSON.stringify(f.sha)}){... on Blob{oid text byteSize isTruncated}}`).join(' ')+'}}';
 const {data:response}=await github(token,'/graphql',{query,variables:{owner,name}});
 if(response.errors?.length)throw new GitHubError(502,'GitHub could not read the complete event batch. Check access and retry.');
 return files.map(f=>{try{const i=valid.indexOf(f);if(i<0)throw Error('Event exceeds 1 MB');const blob=response.data?.repository?.['b'+i];if(!blob||blob.isTruncated||typeof blob.text!=='string'||blob.byteSize>1024*1024)throw Error('Incomplete event blob');const event=JSON.parse(blob.text);const parts=f.path.split('/');if(event.taskId!==parts[1]||event.eventId+'.json'!==parts[2])throw Error('Event identity does not match its file');return {path:f.path,event};}catch(e){return {path:f.path,error:e.message};}});
}

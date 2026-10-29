const enc=new TextEncoder();
export function base64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export function randomSecret(){return base64url(crypto.getRandomValues(new Uint8Array(32)));}
export async function digest(s){return base64url(await crypto.subtle.digest('SHA-256',enc.encode(s)));}
async function key(secret){if(typeof secret!=='string'||secret.length<43)throw new Error('Session encryption is not configured');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function seal(value,secret){const iv=crypto.getRandomValues(new Uint8Array(12));const result=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(secret),enc.encode(value));return base64url(iv)+'.'+base64url(result);}
export async function unseal(value,secret){const [a,b]=value.split('.');const decode=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(a)},await key(secret),decode(b)));}
export function cookieValue(request,name){const match=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));return match?match.slice(name.length+1):null;}
export function safeRepo(value){if(typeof value!=='string'||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(value)||value.includes('..'))throw new Error('Invalid repository');return value;}
export function sameOrigin(request,origin){return request.headers.get('origin')===origin && new URL(request.url).origin===origin;}
export function integer(value,min,max){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw new Error('Invalid pagination');return n;}

export async function readJSON(request,limit=16384){
 const reader=request.body?.getReader();if(!reader)throw new SyntaxError('Missing request');
 let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Request exceeds 16 KB');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}

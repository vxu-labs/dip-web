import { env } from 'cloudflare:workers';
import {cookieValue,digest,unseal} from './security.mjs';
export const SESSION='__Host-dip_session';
export const STATE='__Host-dip_oauth';
export function configuration(){const e=env as any;return {db:e.DB as D1Database,clientId:e.GITHUB_CLIENT_ID as string,clientSecret:e.GITHUB_CLIENT_SECRET as string,key:e.DIP_SESSION_KEY as string,appSlug:e.GITHUB_APP_SLUG as string,origin:'https://dip.vxu.me'};}
export function configured(){const c=configuration();return !!(c.db&&c.clientId&&c.clientSecret&&c.key?.length>=43&&c.appSlug);}
export function setCookie(name:string,value:string,age:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;}
export function json(body:unknown,status=200,extra:Record<string,string>={}){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff',...extra}});}
export async function session(request:Request){const c=configuration();const raw=cookieValue(request,SESSION);if(!c.db||!raw||!/^[\w-]{43}$/.test(raw))return null;const row=await c.db.prepare('SELECT id,user_id,login,token,expires_at FROM github_sessions WHERE id = ? AND expires_at > ?').bind(await digest(raw),Date.now()).first<any>();if(!row)return null;return {id:row.id,userId:row.user_id,login:row.login,token:await unseal(row.token,c.key)};}

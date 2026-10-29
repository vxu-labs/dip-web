import {configuration,configured,setCookie,STATE,SESSION} from '@/lib/auth';
import {cookieValue,digest,randomSecret,seal} from '@/lib/security.mjs';
import {github} from '@/lib/github.mjs';
export async function GET(request:Request){
 const c=configuration();const url=new URL(request.url);const state=url.searchParams.get('state');const cookie=cookieValue(request,STATE);const headers=new Headers({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});headers.append('Set-Cookie',setCookie(STATE,'',0));
 let stage='validation';
 const fail=(reason='unknown')=>{console.warn('DIP OAuth failure',reason);headers.set('Location',c.origin+'/dashboard?auth_error=1&reason='+encodeURIComponent(reason));return new Response(null,{status:303,headers});};
 if(!configured())return fail('configuration');
 if(url.origin!==c.origin)return fail('origin');
 if(!cookie)return fail('missing_state_cookie');
 if(!state||state!==cookie||!/^[\w-]{43}$/.test(state))return fail('state_mismatch');
 if(!url.searchParams.get('code')||url.searchParams.has('error'))return fail('provider_callback');
 try{
 stage='pending_state';
 const pending=await c.db.prepare('DELETE FROM oauth_states WHERE id = ? AND expires_at > ? RETURNING verifier').bind(await digest(state),Date.now()).first<{verifier:string}>();if(!pending)return fail('expired_or_used_state');
 stage='token_exchange_fetch';
 const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','User-Agent':'VXU-DIP-Dashboard'},body:JSON.stringify({client_id:c.clientId,client_secret:c.clientSecret,code:url.searchParams.get('code'),redirect_uri:c.origin+'/api/github/callback',code_verifier:pending.verifier}),signal:AbortSignal.timeout(20000),redirect:'manual'});
 stage='token_exchange_json';
 const token:any=await response.json();if(!response.ok||typeof token.access_token!=='string'||token.error)return fail(typeof token.error==='string'&&/^[a-z_]{1,60}$/.test(token.error)?token.error:'token_exchange_http_'+response.status);
 stage='user_profile';
 const {data:user}=await github(token.access_token,'/user');if(!user.id||typeof user.login!=='string')return fail('invalid_user_profile');
 stage='session_storage';
 const sid=randomSecret();const seconds=Math.min(Number(token.expires_in)||28800,28800);const old=cookieValue(request,SESSION);if(old)await c.db.prepare('DELETE FROM github_sessions WHERE id = ?').bind(await digest(old)).run();
 await c.db.prepare('INSERT INTO github_sessions (id,user_id,login,token,expires_at,created_at) VALUES (?,?,?,?,?,?)').bind(await digest(sid),String(user.id),user.login,await seal(token.access_token,c.key),Date.now()+seconds*1000,Date.now()).run();
 headers.append('Set-Cookie',setCookie(SESSION,sid,seconds));headers.set('Location',c.origin+'/dashboard');return new Response(null,{status:303,headers});
 }catch{return fail(stage);}
}

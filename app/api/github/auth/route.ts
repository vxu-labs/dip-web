import {configuration,configured,json,setCookie,STATE} from '@/lib/auth';
import {randomSecret,digest} from '@/lib/security.mjs';
export async function GET(request:Request){
 if(!configured())return json({error:'GitHub sign-in is being configured. Please try again later.'},503);
 const c=configuration();if(new URL(request.url).origin!==c.origin)return Response.redirect(c.origin+'/api/github/auth',302);
 const state=randomSecret(),verifier=randomSecret();
 await c.db.batch([c.db.prepare('DELETE FROM oauth_states WHERE expires_at < ?').bind(Date.now()),c.db.prepare('DELETE FROM github_sessions WHERE expires_at < ?').bind(Date.now()),c.db.prepare('INSERT INTO oauth_states (id,verifier,expires_at) VALUES (?,?,?)').bind(await digest(state),verifier,Date.now()+600000)]);
 const url=new URL('https://github.com/login/oauth/authorize');url.search=new URLSearchParams({client_id:c.clientId,redirect_uri:c.origin+'/api/github/callback',state,code_challenge:await digest(verifier),code_challenge_method:'S256',allow_signup:'true'}).toString();
 return new Response(null,{status:302,headers:{Location:url.toString(),'Set-Cookie':setCookie(STATE,state,600),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}

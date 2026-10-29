import {configuration,SESSION,setCookie,json} from '@/lib/auth';
import {sameOrigin,cookieValue,digest} from '@/lib/security.mjs';
export async function POST(request:Request){const c=configuration();if(!sameOrigin(request,c.origin))return json({error:'Invalid origin'},403);const id=cookieValue(request,SESSION);if(id&&c.db)await c.db.prepare('DELETE FROM github_sessions WHERE id = ?').bind(await digest(id)).run();return json({ok:true},200,{'Set-Cookie':setCookie(SESSION,'',0)});}

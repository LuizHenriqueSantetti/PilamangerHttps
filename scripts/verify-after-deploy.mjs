// Confirma que as fixtures da primeira publicação sobreviveram à nova implantação.
import{readFileSync,writeFileSync}from'node:fs';import assert from'node:assert/strict';
const origin='https://pilamanager-web-production.up.railway.app';
const cfg=Object.fromEntries(readFileSync('.env.publicacao.local','utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const tag=JSON.parse(readFileSync('test-results/https.json','utf8')).fixtureTag,checks=[];
function check(label,a,b){assert.deepEqual(a,b,label);checks.push(label);console.log('PASS '+label);}
async function call(path,method='GET',body,cookie=''){
 const r=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
 return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||'',headers:r.headers};
}
check('Correct source after redeploy',(await call('/api/health')).data.application,'PilaManager Nova Experiência');
for(const[type,email,password]of [['management',cfg.DEMO_ADMIN_EMAIL,cfg.DEMO_ADMIN_PASSWORD],['reception',cfg.SECOND_USER_EMAIL,cfg.SECOND_USER_PASSWORD]]){
 const login=await call('/api/auth/login','POST',{email,password});check(type+': login after redeploy',login.status,200);
 for(const flag of ['Secure','HttpOnly','SameSite=Lax'])check(type+': cookie '+flag,login.headers.get('set-cookie').includes(flag),true);
 const storage=await call('/api/storage','GET',undefined,login.cookie);check(type+': PostgreSQL read',storage.status,200);
 check(type+': original patient survives',JSON.parse(storage.data.entries.pacientes).some(x=>x.id===tag),true);
 check(type+': receipt survives',JSON.parse(storage.data.entries.pagamentos).find(x=>x.id===tag).status,'pago');
 if(type==='management')check('Commission payout survives',JSON.parse(storage.data.entries.detalheAulasPagamento).find(x=>x.agendamentoId===tag).status,'pago');
 else{check('Reception users forbidden',(await call('/api/users','GET',undefined,login.cookie)).status,403);check('Reception finances forbidden',(await call('/api/storage','POST',{entries:{financeiro:'[]'}},login.cookie)).status,403);}
 await call('/api/auth/logout','POST',{},login.cookie);
 check(type+': revoked session',(await call('/api/storage','GET',undefined,login.cookie)).status,401);
}
writeFileSync('test-results/after-redeploy.json',JSON.stringify({at:new Date().toISOString(),origin,fixtureTag:tag,checks,count:checks.length},null,2));console.log(checks.length+' post-redeploy checks passed');

// Isolated localhost integration checks. Never target a hosted database.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const qa=JSON.parse(readFileSync(new URL('.private/qa.json',root),'utf8'));
assert.equal(qa.origin,'http://127.0.0.1:4192');
const checks=[];
async function call(route,method='GET',body,cookie='',origin=qa.origin){
 const response=await fetch(qa.origin+route,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await response.text();let result;try{result=JSON.parse(text)}catch{result={error:text.slice(0,200)}}
 return {status:response.status,body:result,cookie:response.headers.get('set-cookie')?.split(';')[0]??'',headers:response.headers};
}
function check(label,actual,expected){assert.deepEqual(actual,expected,label);checks.push(label);console.log('PASS '+label);}
check('Unauthenticated storage', (await call('/api/storage')).status,401);
check('Unauthenticated users', (await call('/api/users')).status,401);
check('Cross-origin login', (await call('/api/auth/login','POST',{email:qa.email,password:qa.password},'','https://invalid.example')).status,403);
const setup=await call('/api/setup','POST',qa);
assert.ok([201,409].includes(setup.status),'Bootstrap must succeed or already exist');
const currentPassword=setup.status===201?qa.password:qa.newPassword;
check('Invalid credentials', (await call('/api/auth/login','POST',{email:qa.email,password:'invalid'})).status,401);
let login=await call('/api/auth/login','POST',{email:qa.email,password:currentPassword});
check('Valid login',login.status,200);
assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Lax/);checks.push('HttpOnly and SameSite session cookie');
let cookie=login.cookie;
if(setup.status===201){
 check('Temporary password gates storage',(await call('/api/storage','GET',undefined,cookie)).status,428);
 check('Change local fixture password',(await call('/api/auth/password','POST',{currentPassword,newPassword:qa.newPassword},cookie)).status,200);
}
check('Session restored',(await call('/api/auth/session','GET',undefined,cookie)).body.user.email,qa.email);
// Synthetic test account only: no acceptance on behalf of the user.
check('Fixture privacy state',(await call('/api/privacy','POST',{},cookie)).status,200);
check('Cross-origin write rejected',(await call('/api/storage','POST',{entries:{pacientes:'[]'}},cookie,'https://invalid.example')).status,403);
check('Invalid JSON value rejected',(await call('/api/storage','POST',{entries:{pacientes:'not-json'}},cookie)).status,400);
check('Reserved auth keys rejected',(await call('/api/storage','POST',{entries:{users:'[]'}},cookie)).status,403);
const keys=['pacientes','profissionais','planos','agendamentos','pagamentos','financeiro','comissoes'];
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dates={pacientes:{dataCadastro:today},agendamentos:{date:today},pagamentos:{vencimento:today}};
for(const key of keys){
 const value=JSON.stringify([{id:'qa-integration',nome:'Registro fictício de validação',status:'ativo',...dates[key]}]);
 check(key+': create',(await call('/api/storage','POST',{entries:{[key]:value}},cookie)).status,200);
 check(key+': read',(await call('/api/storage','GET',undefined,cookie)).body.entries[key],value);
 const updated=JSON.stringify([{id:'qa-integration',nome:'Registro fictício atualizado',status:'inativo',...dates[key]}]);
 check(key+': update',(await call('/api/storage','POST',{entries:{[key]:updated}},cookie)).status,200);
 check(key+': read update',(await call('/api/storage','GET',undefined,cookie)).body.entries[key],updated);
}
check('Logout',(await call('/api/auth/logout','POST',{},cookie)).status,200);
check('Revoked cookie rejected',(await call('/api/storage','GET',undefined,cookie)).status,401);
login=await call('/api/auth/login','POST',{email:qa.email,password:qa.newPassword});cookie=login.cookie;
const persisted=(await call('/api/storage','GET',undefined,cookie)).body.entries;
check('Persistence across new login',keys.every(key=>JSON.parse(persisted[key])[0].nome==='Registro fictício atualizado'),true);
// Remove the synthetic records via the same authorized API, leaving UI QA empty.
check('Remove local fixtures',(await call('/api/storage','POST',{removals:keys},cookie)).status,200);
const suffix=Date.now();
for(const role of ['fisio','recepcao']){
 const email=`qa-${role}-${suffix}@example.test`, password='Qa1!'+randomBytes(20).toString('hex'),newPassword='Qa2!'+randomBytes(20).toString('hex');
 check(role+': create account',(await call('/api/users','POST',{name:'Validação '+role,email,role,password},cookie)).status,201);
 const roleLogin=await call('/api/auth/login','POST',{email,password});
 check(role+': temporary password gates storage',(await call('/api/storage','GET',undefined,roleLogin.cookie)).status,428);
 check(role+': change fixture password',(await call('/api/auth/password','POST',{currentPassword:password,newPassword},roleLogin.cookie)).status,200);
 check(role+': users forbidden',(await call('/api/users','GET',undefined,roleLogin.cookie)).status,403);
 check(role+': finances forbidden',(await call('/api/storage','POST',{entries:{financeiro:'[]'}},roleLogin.cookie)).status,403);
 check(role+': escalation forbidden',(await call('/api/users','PATCH',{originalEmail:email,name:'Validação',role:'gerencia'},roleLogin.cookie)).status,403);
 check(role+': deactivate',(await call('/api/users','PATCH',{originalEmail:email,email,name:'Validação',role,ativo:false},cookie)).status,200);
 check(role+': inactive session rejected',(await call('/api/storage','GET',undefined,roleLogin.cookie)).status,401);
 check(role+': inactive login rejected',(await call('/api/auth/login','POST',{email,password:newPassword})).status,401);
 await call('/api/users?email='+encodeURIComponent(email),'DELETE',undefined,cookie);
}
const blockedEmail=`qa-block-${suffix}@example.test`;
for(let i=0;i<5;i++)await call('/api/auth/login','POST',{email:blockedEmail,password:'invalid'});
check('Rate limit after repeated failure',(await call('/api/auth/login','POST',{email:blockedEmail,password:'invalid'})).status,429);
mkdirSync(new URL('test-results/',root),{recursive:true});
writeFileSync(new URL('test-results/api.json',root),JSON.stringify({at:new Date().toISOString(),environment:'localhost PostgreSQL real - Nova Experiência',checks,count:checks.length,limitations:['API storage round-trip is not business-form validation','No production database or real personal data used']},null,2));
console.log(`${checks.length} integration checks passed; report contains no credentials.`);

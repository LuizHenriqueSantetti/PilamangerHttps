// Somente a implantação de demonstração autorizada. Preserva registros existentes.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import assert from'node:assert/strict';
import{randomBytes}from'node:crypto';
const origin='https://pilamanager-web-production.up.railway.app';
const cfg=Object.fromEntries(readFileSync('.env.publicacao.local','utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const checks=[];let cookie='';
async function call(path,method='GET',body,session=cookie,requestOrigin=origin){
 const r=await fetch(origin+path,{method,headers:{Origin:requestOrigin,'Content-Type':'application/json',Cookie:session},body:body===undefined?undefined:JSON.stringify(body)});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text.slice(0,200)}}
 return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||'',headers:r.headers};
}
function check(label,actual,expected){assert.deepEqual(actual,expected,label);checks.push(label);console.log('PASS '+label);}
const health=await call('/api/health');check('Correct application online',health.data.application,'PilaManager Nova Experiência');check('PostgreSQL online',health.data.database,'PostgreSQL');
check('Unauthenticated storage',(await call('/api/storage')).status,401);
check('Unauthenticated users',(await call('/api/users')).status,401);
check('Unauthenticated billing',(await call('/api/billing','POST',{action:'receive',id:'none'})).status,401);
check('Cross-origin login',(await call('/api/auth/login','POST',{email:cfg.DEMO_ADMIN_EMAIL,password:'invalid'},'','https://invalid.example')).status,403);
let login=await call('/api/auth/login','POST',{email:cfg.DEMO_ADMIN_EMAIL,password:cfg.DEMO_ADMIN_PASSWORD});
check('Management login',login.status,200);cookie=login.cookie;
for(const flag of ['HttpOnly','Secure','SameSite=Lax'])check('Cookie '+flag,login.headers.get('set-cookie').includes(flag),true);
check('HTTPS transport security header',login.headers.get('strict-transport-security')?.includes('max-age=31536000'),true);
check('Session restored',(await call('/api/auth/session')).data.user.email,cfg.DEMO_ADMIN_EMAIL);
check('Fictitious management privacy fixture',(await call('/api/privacy','POST',{})).status,200);
check('Cross-origin write',(await call('/api/storage','POST',{entries:{pacientes:'[]'}},cookie,'https://invalid.example')).status,403);
check('Reserved authentication data rejected',(await call('/api/storage','POST',{entries:{users:'[]'}})).status,403);
const snapshot=(await call('/api/storage')).data.entries,records=k=>JSON.parse(snapshot[k]||'[]');
const tag='https-demo-'+Date.now(),today=new Date().toISOString().slice(0,10);
const patient={id:tag,nome:'Paciente Fictício HTTPS',email:'paciente.https@example.invalid',cpf:'529.982.247-25',telefone:'(11) 90000-0000',idade:36,dataNascimento:'1990-01-01',dataCadastro:today,status:'ativo',observacoes:{}};
const plan={id:tag,nome:'Plano Demonstração HTTPS',descricao:'Somente homologação',preco:240,quantidadeAulas:8,duracao:'mensal',beneficios:[],ativo:true,cor:'#087F8C'};
const professional={id:tag,nome:'Profissional Fictício HTTPS',email:'profissional.https@example.invalid',telefone:'(11) 90000-0001',tipoComissao:'percentual',comissaoPercentual:30,valorFixoAula:0,status:'ativo'};
const payment={id:tag,pacienteId:tag,pacienteNome:patient.nome,planoId:tag,plano:plan.nome,valor:240,vencimento:today,status:'pendente',createdAt:today};
const appointment={id:tag,studentId:tag,studentName:patient.nome,professorId:tag,professor:professional.nome,date:today,status:'confirmado',startTime:'08:00',endTime:'09:00'};
for(const[k,fixture]of Object.entries({pacientes:patient,planos:plan,profissionais:professional,pagamentos:payment,agendamentos:appointment})){
 check(k+': append fictitious record',(await call('/api/storage','POST',{entries:{[k]:JSON.stringify([...records(k),fixture])}})).status,200);
 check(k+': read persisted record',JSON.parse((await call('/api/storage')).data.entries[k]).some(x=>x.id===tag),true);
}
check('Unpaid commission rejected',(await call('/api/billing','POST',{action:'accrue',appointmentId:tag,paymentId:tag,confirmed:true})).status,400);
check('Receive fictitious payment',(await call('/api/billing','POST',{action:'receive',id:tag,method:'pix'})).status,200);
check('Double receipt rejected',(await call('/api/billing','POST',{action:'receive',id:tag,method:'pix'})).status,400);
const accrual=await call('/api/billing','POST',{action:'accrue',appointmentId:tag,paymentId:tag,confirmed:true});check('Accrue commission',accrual.status,200);
const commission=JSON.parse(accrual.data.entries.detalheAulasPagamento).find(x=>x.agendamentoId===tag);
check('Server calculates commission',commission.comissao,9);
check('Duplicate commission rejected',(await call('/api/billing','POST',{action:'accrue',appointmentId:tag,paymentId:tag,confirmed:true})).status,400);
check('Pay fictitious commission',(await call('/api/billing','POST',{action:'pay',id:commission.id})).status,200);
check('Double payout rejected',(await call('/api/billing','POST',{action:'pay',id:commission.id})).status,400);
// Se já existir uma conta de recepção desta homologação, reutilize suas credenciais.
let userList=(await call('/api/users')).data.users;
const existing=userList.find(x=>x.email===cfg.SECOND_USER_EMAIL);
let receptionPassword=cfg.SECOND_USER_PASSWORD;
if(!existing){
 const temporary='Tmp!'+randomBytes(24).toString('base64url');
 check('Create second fictitious account',(await call('/api/users','POST',{name:'Recepção Demonstração HTTPS',email:cfg.SECOND_USER_EMAIL,role:'recepcao',password:temporary})).status,201);
 const initial=await call('/api/auth/login','POST',{email:cfg.SECOND_USER_EMAIL,password:temporary});check('Second account login',initial.status,200);
 check('Temporary password gates storage',(await call('/api/storage','GET',undefined,initial.cookie)).status,428);
 check('Activate fictitious account password',(await call('/api/auth/password','POST',{currentPassword:temporary,newPassword:receptionPassword},initial.cookie)).status,200);
}
const reception=await call('/api/auth/login','POST',{email:cfg.SECOND_USER_EMAIL,password:receptionPassword});check('Reception independent session',reception.status,200);
check('Fictitious reception privacy fixture',(await call('/api/privacy','POST',{},reception.cookie)).status,200);
check('Reception cannot list users',(await call('/api/users','GET',undefined,reception.cookie)).status,403);
check('Reception cannot write finances',(await call('/api/storage','POST',{entries:{financeiro:'[]'}},reception.cookie)).status,403);
check('Reception cannot escalate role',(await call('/api/users','PATCH',{originalEmail:cfg.SECOND_USER_EMAIL,name:'Recepção Demonstração HTTPS',role:'gerencia'},reception.cookie)).status,403);
check('Reception sees persisted patient',JSON.parse((await call('/api/storage','GET',undefined,reception.cookie)).data.entries.pacientes).some(x=>x.id===tag),true);
check('Logout revokes management session',(await call('/api/auth/logout','POST',{})).status,200);
check('Revoked cookie rejected',(await call('/api/storage')).status,401);
login=await call('/api/auth/login','POST',{email:cfg.DEMO_ADMIN_EMAIL,password:cfg.DEMO_ADMIN_PASSWORD});cookie=login.cookie;check('New management session',login.status,200);
check('Patient survives new session',JSON.parse((await call('/api/storage')).data.entries.pacientes).some(x=>x.id===tag),true);
mkdirSync('test-results',{recursive:true});writeFileSync('test-results/https.json',JSON.stringify({at:new Date().toISOString(),origin,checks,count:checks.length,fixtureTag:tag,limitations:['Devices are not physically independent','Collections retain original JSON storage model','No real personal data imported']},null,2));
console.log(checks.length+' HTTPS checks passed');

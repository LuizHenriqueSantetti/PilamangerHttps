// Restaura exclusivamente o dump fictício autorizado em banco local temporário.
import pg from'pg';import{spawnSync}from'node:child_process';import assert from'node:assert/strict';
import{writeFileSync}from'node:fs';
const url=new URL(process.env.DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');
const database='pila_restore_qa_'+Date.now(),admin=new pg.Client({connectionString:url.href});await admin.connect();
try{
 await admin.query(`CREATE DATABASE "${database}"`);
 const r=spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_restore.exe',['--exit-on-error','--no-owner','--no-acl','-h',url.hostname,'-p',url.port,'-U',decodeURIComponent(url.username),'-d',database,'.private/pilamanager-nova-demo.dump'],{env:{...process.env,PGPASSWORD:decodeURIComponent(url.password)},encoding:'utf8',windowsHide:true});
 if(r.status!==0)throw Error('Falha no restore: '+r.stderr.slice(0,700));
 const restoredUrl=new URL(url);restoredUrl.pathname='/'+database;
 const restored=new pg.Client({connectionString:restoredUrl.href});await restored.connect();
 try{
  const users=(await restored.query('SELECT COUNT(*)::int n FROM pilamanager_nova_experiencia.users')).rows[0].n;
  const entries=(await restored.query('SELECT key,value FROM pilamanager_nova_experiencia.app_storage')).rows;
  assert.equal(users,2);const patients=JSON.parse(entries.find(x=>x.key==='pacientes').value);assert.ok(patients.some(x=>x.nome==='Paciente Fictício HTTPS'));
  const result={at:new Date().toISOString(),restored:true,users,collections:entries.length,patientFixtureVerified:true,source:'Railway PostgreSQL 18.6',restoreTarget:'Local PostgreSQL 17 temporary database',limitations:['Automated Railway backups not available on trial','This is a one-time manual backup']};
  writeFileSync('test-results/backup-restore.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await restored.end();}
}finally{await admin.query(`DROP DATABASE IF EXISTS "${database}"`);await admin.end();}

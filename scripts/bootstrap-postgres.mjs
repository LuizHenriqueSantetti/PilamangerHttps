// Contas fictícias somente no ambiente de demonstração expressamente habilitado.
import pg from 'pg';
import {randomBytes,pbkdf2Sync,randomUUID}from'node:crypto';
try{process.loadEnvFile('.env');}catch(e){if(e.code!=='ENOENT')throw e;}
if(process.env.DEMO_MODE!=='true'){console.log('Seed de demonstração desabilitado.');process.exit(0);}
const schema=process.env.PG_SCHEMA||'pilamanager_nova_experiencia';
if(!/^[a-z_][a-z0-9_]*$/.test(schema))throw Error('PG_SCHEMA inválido.');
const password=process.env.DEMO_ADMIN_PASSWORD||'';
if(password.length<16)throw Error('Defina uma senha de demonstração forte.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});await client.connect();
try{
 const email=process.env.DEMO_ADMIN_EMAIL||'gestao.demo@example.invalid';
 if((await client.query('SELECT 1 FROM users WHERE email=$1',[email])).rowCount){console.log('Conta fictícia já existe.');process.exitCode=0;}
 else{
  const salt=randomBytes(16).toString('base64url');let material=Buffer.from(password);
  for(let stage=0;stage<4;stage++)material=pbkdf2Sync(material,`${salt}:${stage}`,100000,32,'sha256');
  const hash=`pbkdf2_sha256_chain$4x100000$${salt}$${material.toString('base64url')}`,now=new Date().toISOString();
  await client.query("INSERT INTO users(id,email,name,role,password_hash,active,must_change_password,created_at,updated_at) VALUES($1,$2,$3,'gerencia',$4,1,0,$5,$5)",[randomUUID(),email,'Gestão Demonstração Nova Experiência',hash,now]);
  console.log('Conta fictícia de demonstração criada. Nenhum dado do Site original foi importado.');
 }
}finally{await client.end();}

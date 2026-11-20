import pg from 'pg';
import {readFile,readdir}from'node:fs/promises';
try{process.loadEnvFile('.env');}catch(e){if(e.code!=='ENOENT')throw e;}
const schema=process.env.PG_SCHEMA||'pilamanager_nova_experiencia';
if(!/^[a-z_][a-z0-9_]*$/.test(schema))throw Error('PG_SCHEMA inválido.');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL não configurada.');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,...(process.env.DB_SSL==='true'?{ssl:{rejectUnauthorized:true}}:{})});
await client.connect();
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(176112345)');
 await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);await client.query(`SET LOCAL search_path TO ${schema}`);
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(filename TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 for(const name of (await readdir('postgres')).filter(v=>v.endsWith('.sql')).sort()){
  if((await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1',[name])).rowCount)continue;
  await client.query(await readFile('postgres/'+name,'utf8'));await client.query('INSERT INTO schema_migrations(filename) VALUES($1)',[name]);console.log('Migration PostgreSQL aplicada:',name);
 }
 await client.query('COMMIT');console.log('Schema exclusivo da Nova Experiência pronto.');
}catch(e){await client.query('ROLLBACK');throw e;}finally{await client.end();}

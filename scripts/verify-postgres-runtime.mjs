// Exclusivamente PostgreSQL local de homologação; fixtures próprias e descartáveis.
import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import ts from'typescript';
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
const url=new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
mkdirSync('.private',{recursive:true});
writeFileSync('.private/runtime-test.mjs',ts.transpileModule(readFileSync('src/server/runtime.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const{env,getPool,postgresSQL}=await import('../.private/runtime-test.mjs');
const key='qa-runtime-'+randomUUID(),checks=[];
function check(label,value){assert.ok(value,label);checks.push(label);console.log('PASS '+label);}
try{
 check('Placeholder preserves quoted question mark',postgresSQL("SELECT '?' AS literal, ? AS value")==="SELECT '?' AS literal, $1 AS value");
 const row=await env.DB.prepare("SELECT '?' AS literal, ?::text AS value").bind('fictício').first();
 check('Bound query reaches PostgreSQL',row.literal==='?'&&row.value==='fictício');
 await env.DB.prepare('INSERT INTO app_storage(key,value,updated_at) VALUES(?,?,?)').bind(key,'original',new Date().toISOString()).run();
 await assert.rejects(env.DB.batch([
  env.DB.prepare('UPDATE app_storage SET value=? WHERE key=?').bind('should-rollback',key),
  env.DB.prepare('INSERT INTO app_storage(key,value,updated_at) VALUES(?,?,?)').bind(key,'duplicate',new Date().toISOString())
 ]));
 check('Failed batch rolls back all statements',(await env.DB.prepare('SELECT value FROM app_storage WHERE key=?').bind(key).first('value'))==='original');
 await env.BUCKET.put(key,new Uint8Array([1,2,3,255]),{httpMetadata:{contentType:'application/octet-stream'}});
 check('File bytes and type persisted in PostgreSQL',(await env.BUCKET.get(key)).body.join(',')==='1,2,3,255');
 await getPool().end();delete globalThis.__pilaPgPool;
 check('New pool sees stored object',Boolean(await env.BUCKET.head(key)));
 check('New pool sees stored collection',(await env.DB.prepare('SELECT value FROM app_storage WHERE key=?').bind(key).first('value'))==='original');
 console.log(checks.length+' PostgreSQL adapter checks passed');
}finally{await getPool().query('DELETE FROM file_objects WHERE key=$1',[key]);await getPool().query('DELETE FROM app_storage WHERE key=$1',[key]);await getPool().end();}

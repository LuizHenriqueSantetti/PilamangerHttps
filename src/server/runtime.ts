// Adaptação de hospedagem: mantém os contratos das rotas originais sobre PostgreSQL.
import pg from 'pg';

const schema=process.env.PG_SCHEMA||'pilamanager_nova_experiencia';
if(!/^[a-z_][a-z0-9_]*$/.test(schema))throw new Error('PG_SCHEMA inválido.');
const globalDb=globalThis as typeof globalThis & { __pilaPgPool?: pg.Pool };
export function getPool(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL não configurada.');
 return globalDb.__pilaPgPool ||= new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:10000,options:`-c search_path=${schema}`,
  ...(process.env.DB_SSL==='true'?{ssl:{rejectUnauthorized:true}}:{})});
}
export function postgresSQL(source:string){
 let result='',quote='',index=0;
 for(let i=0;i<source.length;i++){
  const char=source[i];
  if(quote){
   if(char===quote){if(source[i+1]===quote){result+=quote==='`'?'""':char+char;i++;continue;}quote='';}
   result+=char==='`'?'"':char;continue;
  }
  if(char==="'"||char==='"'||char==='`'){quote=char;result+=char==='`'?'"':char;}
  else result+=char==='?'?'$'+(++index):char;
 }
 return result.replace(/\bWHERE\s+1(?=\s+(?:ON|RETURNING|ORDER|LIMIT)|\s*$)/gi,'WHERE TRUE');
}
async function transaction<T>(operation:(client:pg.PoolClient)=>Promise<T>):Promise<T>{
 for(let attempt=0;;attempt++){
  const client=await getPool().connect();
  try{await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');const value=await operation(client);await client.query('COMMIT');return value;}
  catch(error){await client.query('ROLLBACK');if((error as {code?:string}).code==='40001'&&attempt<3)continue;throw error;}
  finally{client.release();}
 }
}
class Statement{
 constructor(readonly sql:string,readonly values:unknown[]=[]){ }
 bind(...values:unknown[]){return new Statement(this.sql,values);}
 async execute(client:pg.Pool|pg.PoolClient){
  const result=await client.query(postgresSQL(this.sql),this.values);
  return {results:result.rows,success:true,meta:{changes:result.command==='SELECT'?0:result.rowCount||0}};
 }
 async all<T=Record<string,unknown>>(){const result=await this.execute(getPool());return {...result,results:result.results as T[]};}
 async first<T=Record<string,unknown>>(column?:string):Promise<T|null>{const {results}=await this.all();return (column?results[0]?.[column]:results[0]) as T??null;}
 async run(){return transaction(client=>this.execute(client));}
}
const DB={prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>transaction(async client=>{const results=[];for(const statement of statements)results.push(await statement.execute(client));return results;})};
const BUCKET={
 async put(key:string,bytes:Uint8Array,options:{httpMetadata?:{contentType?:string};customMetadata?:Record<string,string>}={}){
  await getPool().query('INSERT INTO file_objects(key,body,content_type,metadata) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET body=excluded.body,content_type=excluded.content_type,metadata=excluded.metadata',[key,Buffer.from(bytes),options.httpMetadata?.contentType||'application/octet-stream',JSON.stringify(options.customMetadata||{})]);
 },
 async head(key:string){const result=await getPool().query('SELECT key FROM file_objects WHERE key=$1',[key]);return result.rows[0]||null;},
 async get(key:string){const result=await getPool().query('SELECT body,content_type FROM file_objects WHERE key=$1',[key]);const row=result.rows[0];return row?{body:new Uint8Array(row.body),httpMetadata:{contentType:row.content_type}}:null;}
};
export const env={DB,BUCKET,get BOOTSTRAP_SECRET(){return process.env.BOOTSTRAP_SECRET;},get OWNER_RECOVERY_GRANT(){return process.env.OWNER_RECOVERY_GRANT;}};

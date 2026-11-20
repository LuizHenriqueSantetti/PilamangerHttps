import pg from'pg';
const schema=process.env.PG_SCHEMA||'pilamanager_nova_experiencia';
if(!/^[a-z_][a-z0-9_]*$/.test(schema))throw Error('Schema inválido');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});await client.connect();
try{
 const tables=(await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name',[schema])).rows;
 const counts={};for(const{table_name:t}of tables)counts[t]=(await client.query(`SELECT COUNT(*)::int n FROM "${t}"`)).rows[0].n;
 console.log(JSON.stringify({schema,engine:(await client.query('SELECT version() version')).rows[0].version,counts},null,2));
}finally{await client.end();}

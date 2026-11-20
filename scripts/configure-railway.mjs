import {existsSync,readFileSync,writeFileSync}from'node:fs';
import{randomBytes}from'node:crypto';
import{spawnSync}from'node:child_process';
const cli=process.env.RAILWAY_CLI;if(!cli)throw Error('RAILWAY_CLI necessária');
const file='.env.publicacao.local';
if(!existsSync(file))writeFileSync(file,`DEMO_ADMIN_EMAIL=gestao.nova.online@example.invalid\nDEMO_ADMIN_PASSWORD=Nova!${randomBytes(24).toString('base64url')}\nSECOND_USER_EMAIL=recepcao.nova.online@example.invalid\nSECOND_USER_PASSWORD=Recep!${randomBytes(24).toString('base64url')}\n`,{mode:0o600});
const credentials=Object.fromEntries(readFileSync(file,'utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const values={NODE_ENV:'production',COOKIE_SECURE:'true',DATABASE_URL:'${{Postgres.DATABASE_URL}}',PG_SCHEMA:'pilamanager_nova_experiencia',DEMO_MODE:'true',PUBLIC_ORIGIN:'https://pilamanager-web-production.up.railway.app',DEMO_ADMIN_EMAIL:credentials.DEMO_ADMIN_EMAIL,DEMO_ADMIN_PASSWORD:credentials.DEMO_ADMIN_PASSWORD};
for(const[key,value]of Object.entries(values)){
 const r=spawnSync(cli,['variable','set',key,'--stdin','--skip-deploys','--project','b5a6d3ea-2053-4655-b5ba-191c55b20cfb','--environment','production','--service','pilamanager-web'],{input:value,encoding:'utf8',windowsHide:true,timeout:45000});
 if(r.status!==0)throw Error('Não configurado: '+key+'; saída omitida.');console.log('Configurado: '+key);
}

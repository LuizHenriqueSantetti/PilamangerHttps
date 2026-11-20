// Backup pontual, sem serviço pago e sem expor credenciais ou conteúdo na saída.
import{spawnSync}from'node:child_process';
import{existsSync,mkdirSync,writeFileSync,renameSync}from'node:fs';
import{resolve,join}from'node:path';import{createHash,randomUUID}from'node:crypto';
import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
process.chdir(root);
const cli=process.env.RAILWAY_CLI||'C:/Users/lhenr/AppData/Local/npm-cache/_npx/79fa66f96c8fdacf/node_modules/@railway/cli/bin/railway.exe';
const key=resolve('.private/railway-backup-ssh');
if(!existsSync(key))throw Error('Chave privada local de backup ausente.');
const marker=randomUUID().replaceAll('-',''),remote='/tmp/pila-backup-'+marker+'.dump';
const command=`pg_dump -U postgres -d railway -n pilamanager_nova_experiencia -Fc -f ${remote} && printf '\\nPILA_BEGIN_${marker}\\n' && base64 ${remote} && printf '\\nPILA_END_${marker}\\n'`;
const r=spawnSync(cli,['ssh','--project','b5a6d3ea-2053-4655-b5ba-191c55b20cfb','--environment','production','--service','Postgres','--identity-file',key,'--','sh','-lc',command],{encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:128*1024*1024});
if(r.status!==0){writeFileSync('.private/backup-error.log',r.stderr||r.error?.message||'Falha desconhecida',{mode:0o600});throw Error('Falha no backup SSH; diagnóstico privado em .private/backup-error.log.');}
const encoded=r.stdout.split('PILA_BEGIN_'+marker)[1]?.split('PILA_END_'+marker)[0];
if(!encoded)throw Error('Transferência incompleta; backup não registrado.');
const bytes=Buffer.from(encoded.replace(/\s/g,''),'base64');
if(bytes.subarray(0,5).toString()!=='PGDMP')throw Error('Arquivo PostgreSQL inválido; backup não registrado.');
const dir=resolve('.private/backups');mkdirSync(dir,{recursive:true});
const file=join(dir,'pila-'+new Date().toISOString().replaceAll(':','-')+'-'+marker.slice(0,8)+'.dump');
writeFileSync(file+'.partial',bytes,{mode:0o600});
const verify=spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_restore.exe',['--list',file+'.partial'],{encoding:'utf8',windowsHide:true,timeout:30000});
if(verify.status!==0)throw Error('pg_restore não reconheceu o arquivo; mantido apenas .partial para diagnóstico.');
renameSync(file+'.partial',file);
const result={at:new Date().toISOString(),file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),archiveVerified:true,schema:'pilamanager_nova_experiencia',automaticDeletion:false};
writeFileSync(file+'.json',JSON.stringify(result,null,2),{mode:0o600});
writeFileSync(join(dir,'latest.json'),JSON.stringify(result,null,2),{mode:0o600});
// Remove somente o arquivo temporário específico que este processo criou no container.
const clean=spawnSync(cli,['ssh','--project','b5a6d3ea-2053-4655-b5ba-191c55b20cfb','--environment','production','--service','Postgres','--identity-file',key,'--','rm',remote],{encoding:'utf8',windowsHide:true,timeout:30000});
result.remoteTemporaryRemoved=clean.status===0;
console.log(JSON.stringify(result,null,2));

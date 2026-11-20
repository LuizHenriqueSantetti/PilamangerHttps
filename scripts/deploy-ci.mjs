// Publicação exclusivamente no serviço/ambiente autorizado; executado após CI.
import{spawnSync}from'node:child_process';
const project='b5a6d3ea-2053-4655-b5ba-191c55b20cfb',service='pilamanager-web',environment='production';
if(!process.env.RAILWAY_TOKEN)throw Error('Token do projeto não configurado.');
function cli(args){const r=spawnSync('railway',args,{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});if(r.status!==0)throw Error('Railway CLI falhou; saída omitida para proteger credenciais.');return r.stdout;}
const selectors=['--project',project,'--environment',environment,'--service',service];
const before=new Set(JSON.parse(cli(['deployment','list',...selectors,'--json'])).map(x=>x.id));
cli(['up',...selectors,'--detach','--yes','--json','--message','GitHub '+(process.env.GITHUB_SHA||'manual')]);
let id;
for(let attempt=0;attempt<96;attempt++){
 const deployments=JSON.parse(cli(['deployment','list',...selectors,'--json']));
 if(!id)id=deployments.find(x=>!before.has(x.id))?.id;
 const deployment=deployments.find(x=>x.id===id);
 if(deployment){
  console.log('Railway deployment '+id+': '+deployment.status);
  if(['FAILED','CRASHED','REMOVED','SKIPPED'].includes(deployment.status))throw Error('Implantação não ficou saudável.');
  if(deployment.status==='SUCCESS'){
   const origin='https://pilamanager-web-production.up.railway.app';
   const health=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(15000)});
   const body=await health.json();
   if(health.status!==200||body.application!=='PilaManager Nova Experiência'||body.database!=='PostgreSQL')throw Error('Healthcheck público da fonte correta não aprovado.');
   if((await fetch(origin+'/api/storage',{signal:AbortSignal.timeout(15000)})).status!==401)throw Error('API deveria exigir autenticação.');
   console.log('Implantação e HTTPS autenticado conferidos.');process.exit(0);
  }
 }
 await new Promise(r=>setTimeout(r,5000));
}
throw Error('Tempo de espera esgotado; verificar o Railway antes de repetir.');

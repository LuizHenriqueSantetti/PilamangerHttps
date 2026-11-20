// Configuração administrativa: token limitado a um projeto/ambiente, nunca impresso.
import{spawnSync}from'node:child_process';import{writeFileSync,readFileSync,unlinkSync}from'node:fs';
const cli=process.env.RAILWAY_CLI||'C:/Users/lhenr/AppData/Local/npm-cache/_npx/79fa66f96c8fdacf/node_modules/@railway/cli/bin/railway.exe';
const gh='C:/Users/lhenr/Documents/RBXCREATE/tools/gh/bin/gh.exe',repo='LuizHenriqueSantetti/pilamanager-nova-experiencia-postgres';
function run(exe,args,input,env=process.env){const r=spawnSync(exe,args,{input,env,encoding:'utf8',windowsHide:true,timeout:45000});if(r.status!==0){writeFileSync('.private/ci-error.log',r.stderr||r.error?.message||'Falha desconhecida',{mode:0o600});writeFileSync('.private/ci-error-response.json',r.stdout||'{}',{mode:0o600});throw Error('Falha administrativa; diagnóstico privado .private/ci-error.log.');}return r.stdout;}
const credential=run('git',['credential','fill'],'protocol=https\nhost=github.com\nusername=LuizHenriqueSantetti\n\n',{...process.env,GCM_INTERACTIVE:'Never'});
const password=credential.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);if(!password)throw Error('Credencial GitHub não disponível.');
const ghEnv={...process.env,GH_TOKEN:password};
const secrets=JSON.parse(run(gh,['secret','list','--repo',repo,'--json','name'],undefined,ghEnv));
if(secrets.some(x=>x.name==='RAILWAY_TOKEN')){console.log('Secret de CI já configurado; nenhum novo token criado.');process.exit(0);}
// A criação pelo painel requer confirmação explícita do proprietário.
const tokenFile='.private/ci-project-token.txt',token=readFileSync(tokenFile,'utf8').trim();
const response=JSON.parse(run(cli,['api','--compact'],'query { projectToken { projectId environmentId } }',{...process.env,RAILWAY_TOKEN:token}));
if(response.data?.projectToken?.projectId!=='b5a6d3ea-2053-4655-b5ba-191c55b20cfb'||response.data.projectToken.environmentId!=='2c6d7355-5504-44ff-964b-8067b1f4ef33')throw Error('A credencial não tem o escopo esperado.');
run(gh,['secret','set','RAILWAY_TOKEN','--repo',repo],token,ghEnv);
unlinkSync(tokenFile);
writeFileSync('.private/ci-configured.json',JSON.stringify({at:new Date().toISOString(),repository:repo,secret:'RAILWAY_TOKEN',scope:'single Railway project and production environment'},null,2));
console.log('CI configurada com token exclusivo do projeto/ambiente. Nenhuma credencial exibida.');

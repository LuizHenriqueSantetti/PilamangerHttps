// One-time owner setup. Credentials arrive on hidden stdin, never command arguments.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
process.stdin.setRawMode?.(true);
process.stdin.resume();
console.log('Ready for owner setup JSON on hidden stdin.');
const raw=await new Promise(resolve=>{
 let input='';
 const receive=chunk=>{input+=chunk.toString();if(input.includes('\u0003'))process.exit(130);if(/[\r\n]/.test(input)){process.stdin.off('data',receive);resolve(input.trim());}};
 process.stdin.on('data',receive);
});
process.stdin.setRawMode?.(false);process.stdin.pause();
const config=JSON.parse(raw);
const origin=new URL(config.url).origin;
if(origin!=='https://pilamanager-nova-experiencia.luizsantetti.chatgpt.site')throw Error('Unexpected target; original Site must remain untouched');
const headers={'Content-Type':'application/json',Origin:origin,'OAI-Sites-Authorization':`Bearer ${config.serviceToken}`};
const loginPage=await fetch(origin,{headers});
if(!loginPage.ok)throw Error(`Hosted page unavailable: ${loginPage.status}`);
const unauthorized=await fetch(origin+'/api/storage',{headers});
if(unauthorized.status!==401)throw Error('Application authentication boundary failed');
const setup=await fetch(origin+'/api/setup',{method:'POST',headers,body:JSON.stringify({bootstrapSecret:config.secret,email:config.email,name:config.name,password:config.password})});
if(setup.status!==201)throw Error(`Owner initialization did not complete: HTTP ${setup.status}`);
// Persist the initial credential outside OneDrive and source control, only after account creation.
const directory=path.join(process.env.LOCALAPPDATA,'PilaManager','private');
await mkdir(directory,{recursive:true});
const accessFile=path.join(directory,'nova-experiencia-primeiro-acesso.txt');
await writeFile(accessFile,`PilaManager — novo site privado\n\nEndereço: ${origin}\nE-mail: ${config.email}\nSenha temporária: ${config.password}\n\nTroque a senha no primeiro acesso. Não compartilhe este arquivo.\nA conta e o banco do site original não foram alterados.\nApós entrar e trocar a senha, exclua este arquivo local.\n`,{flag:'wx',mode:0o600});
const login=await fetch(origin+'/api/auth/login',{method:'POST',headers,body:JSON.stringify({email:config.email,password:config.password})});
if(!login.ok)throw Error(`Owner created but login test failed: ${login.status}; credential saved locally`);
const cookie=login.headers.get('set-cookie');
if(!cookie?.includes('HttpOnly')||!cookie.includes('Secure')||!cookie.includes('SameSite=Lax'))throw Error('Hosted cookie properties failed');
const gated=await fetch(origin+'/api/storage',{headers:{...headers,Cookie:cookie.split(';')[0]}});
if(gated.status!==428)throw Error('Mandatory password change gate failed');
await fetch(origin+'/api/auth/logout',{method:'POST',headers:{...headers,Cookie:cookie.split(';')[0]},body:'{}'});
console.log(JSON.stringify({url:origin,ownerCreated:true,https:true,unauthenticatedApi:401,passwordChangeGate:428,secureCookie:true,accessFile}));

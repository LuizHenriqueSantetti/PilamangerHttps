import{spawn}from'node:child_process';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','0.0.0.0','-p',process.env.PORT||'3102'],{stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));

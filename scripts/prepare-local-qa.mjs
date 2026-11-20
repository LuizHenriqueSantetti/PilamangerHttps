// Creates only ignored localhost QA credentials, never production accounts/data.
import {randomBytes} from 'node:crypto';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
if(!root.endsWith('Site - Pilamanger Novo'))throw Error('Unexpected checkout');
const file=path.join(root,'.private/qa.json');
if(existsSync(file))throw Error('QA already prepared; reuse existing local fixture');
mkdirSync(path.dirname(file),{recursive:true});
const fixture={origin:'http://127.0.0.1:4192',name:'Validação PilaManager',email:'qa-admin@example.test',bootstrapSecret:randomBytes(32).toString('hex'),password:'Qa!'+randomBytes(20).toString('base64url'),newPassword:'Qa!'+randomBytes(20).toString('base64url')};
writeFileSync(file,JSON.stringify(fixture,null,2));
writeFileSync(path.join(root,'.dev.vars'),`BOOTSTRAP_SECRET=${fixture.bootstrapSecret}\n`);
console.log('Local QA secrets prepared in ignored paths; no values logged.');

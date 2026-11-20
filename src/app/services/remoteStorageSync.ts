const API_URL='/api/storage';
const DEVICE_ONLY_KEYS=/^(preferences_|idioma$|accessibilitySettings$|animationsEnabled$|favoriteColors$)/;
const AUTH_KEYS=new Set(['users','currentUser','savedLoginAccounts','loginAttempts','isManagerAuthenticated','rememberSession']);
const nativeSet=typeof Storage!=='undefined'?Storage.prototype.setItem:undefined;
const nativeRemove=typeof Storage!=='undefined'?Storage.prototype.removeItem:undefined;
const nativeClear=typeof Storage!=='undefined'?Storage.prototype.clear:undefined;
export type RemoteSaveState='idle'|'saving'|'saved'|'error';
let state:RemoteSaveState='idle',active=false,installed=false;
const pending=new Map<string,string|null>();
let running:Promise<void>|null=null;
let lastSaveError='Não foi possível salvar. Seus dados foram mantidos para tentar novamente.';
const shouldSync=(key:string)=>Boolean(key)&&!key.startsWith('__pilamanager_')&&!AUTH_KEYS.has(key)&&!DEVICE_ONLY_KEYS.test(key);
export const getRemoteSaveState=()=>state;
export const hasPendingRemoteChanges=()=>pending.size>0||Boolean(running);
function updateState(value:RemoteSaveState){state=value;window.dispatchEvent(new CustomEvent('pilamanager:sync-state'));}

async function drain(){
 while(pending.size&&active){
  const batch=new Map(pending);pending.clear();updateState('saving');
  try{
   const entries:Record<string,string>={},removals:string[]=[];
   batch.forEach((value,key)=>value===null?removals.push(key):entries[key]=value);
   const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries,removals})});
   if(!response.ok){
    if(response.status===401)window.dispatchEvent(new Event('pilamanager:session-expired'));
    if(response.status===403)window.dispatchEvent(new Event('pilamanager:permission-denied'));
    throw new Error(response.status===401?'Sua sessão expirou. Entre novamente para continuar.':response.status===403?'Você não tem permissão para realizar esta ação.':response.status===409?'Os dados foram alterados em outra sessão. Atualize a página antes de continuar.':'Não foi possível salvar. Seus dados foram mantidos para tentar novamente.');
   }
  }catch(error){
   // Keep newer edits and retain rejected writes for explicit retry, never claim success.
   batch.forEach((value,key)=>{if(!pending.has(key))pending.set(key,value);});
   lastSaveError=error instanceof TypeError?'Falha de conexão com o servidor. Tente novamente.':error instanceof Error?error.message:'Não foi possível salvar. Seus dados foram mantidos para tentar novamente.';
   updateState('error');window.dispatchEvent(new CustomEvent('pilamanager:save-error',{detail:{message:lastSaveError}}));return;
  }
 }
 if(active)updateState('saved');
}
function start(){if(!running)running=Promise.resolve().then(drain).finally(()=>{running=null;});return running;}
function enqueue(key:string,value:string|null){pending.set(key,value);if(state!=='error')void start();}
export async function flushRemoteStorage(){await start();if(pending.size||state==='error')throw new Error(lastSaveError);}
export async function retryRemoteStorage(){const failed=state==='error';await start();if(failed&&getRemoteSaveState()==='saved')window.dispatchEvent(new Event('pilamanager:retry-saved'));}

export async function billingAction(payload: Record<string, unknown>) {
 await flushRemoteStorage();
 const response = await fetch('/api/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
 const result = await response.json() as { error?: string; entries: Record<string, string> };
 if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a operação.');
 for (const [key, value] of Object.entries(result.entries as Record<string, string>)) nativeSet?.call(localStorage, key, value);
 window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
}

export function clearRemoteStorageCache(){
 if(typeof window==='undefined'||!nativeRemove)return;
 active=false;pending.clear();
 window.dispatchEvent(new Event('pilamanager:cache-cleared'));
 const keys=Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).filter((k):k is string=>Boolean(k));
 for(const key of keys)if(shouldSync(key)||key.startsWith('__pilamanager_'))nativeRemove.call(localStorage,key);
 updateState('idle');
}

export async function installRemoteStorageSync(){
 if(typeof window==='undefined'||!nativeSet||!nativeRemove||!nativeClear)return;
 const response=await fetch(API_URL,{cache:'no-store'});
 if(!response.ok)throw new Error('Não foi possível carregar os dados do servidor. Tente entrar novamente.');
 const snapshot=await response.json() as {entries?:Record<string,string>};
 if(!snapshot.entries||typeof snapshot.entries!=='object')throw new Error('Resposta de dados inválida.');
 // The authenticated server is authoritative. Never resurrect a previous user's cache.
 clearRemoteStorageCache();
 for(const [key,value] of Object.entries(snapshot.entries))if(shouldSync(key))nativeSet.call(localStorage,key,value);
 active=true;updateState('idle');
 if(installed)return;installed=true;
 Storage.prototype.setItem=function(key:string,value:string){const previous=this.getItem(key);nativeSet.call(this,key,value);if(this===localStorage&&active&&shouldSync(key)&&previous!==String(value))enqueue(key,String(value));};
 Storage.prototype.removeItem=function(key:string){const existed=this.getItem(key)!==null;nativeRemove.call(this,key);if(this===localStorage&&active&&shouldSync(key)&&existed)enqueue(key,null);};
 Storage.prototype.clear=function(){const keys=Array.from({length:this.length},(_,i)=>this.key(i)).filter((k):k is string=>Boolean(k)&&shouldSync(k!));nativeClear.call(this);if(this===localStorage&&active)keys.forEach(k=>enqueue(k,null));};
 window.addEventListener('beforeunload',event=>{if(pending.size||running){event.preventDefault();(event as BeforeUnloadEvent).returnValue='';}});
}

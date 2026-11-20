import {useEffect,useState} from 'react';
import {CloudUpload,AlertCircle} from 'lucide-react';
import {getRemoteSaveState,retryRemoteStorage,type RemoteSaveState} from '../services/remoteStorageSync';
export function SyncStatus(){
 const [state,setState]=useState<RemoteSaveState>(getRemoteSaveState);
 useEffect(()=>{const update=()=>setState(getRemoteSaveState());window.addEventListener('pilamanager:sync-state',update);return()=>window.removeEventListener('pilamanager:sync-state',update)},[]);
 if(state!=='saving'&&state!=='error')return null;
 const Icon=state==='saving'?CloudUpload:AlertCircle;
 return <div className="pm-save-state" data-state={state} role="status" aria-live="polite">
  <Icon size={14}/>
  <span>{state==='saving'?'Salvando…':'Não salvo'}</span>
  {state==='error'&&<button type="button" onClick={()=>void retryRemoteStorage()}>Tentar novamente</button>}
 </div>
}

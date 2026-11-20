import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
beforeEach(()=>{
 vi.resetModules();
 class Store{data=new Map<string,string>();get length(){return this.data.size}key(i:number){return [...this.data.keys()][i]??null}getItem(k:string){return this.data.get(k)??null}setItem(k:string,v:string){this.data.set(k,String(v))}removeItem(k:string){this.data.delete(k)}clear(){this.data.clear()}}
 const storage=new Store(),events=new EventTarget();
 vi.stubGlobal('Storage',Store);vi.stubGlobal('localStorage',storage);
 vi.stubGlobal('window',{localStorage:storage,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)});
});
afterEach(()=>vi.unstubAllGlobals());
describe('persistência confirmada pelo servidor',()=>{
 it('substitui cache antigo pelo snapshot sem reenviar dados de outro usuário',async()=>{
  localStorage.setItem('pacientes','[{"id":"stale"}]');localStorage.setItem('cargos','[]');localStorage.setItem('idioma','pt');
  const fetch=vi.fn().mockResolvedValue(Response.json({entries:{pacientes:'[]'}}));vi.stubGlobal('fetch',fetch);
  const service=await import('../src/app/services/remoteStorageSync');await service.installRemoteStorageSync();
  expect(localStorage.getItem('pacientes')).toBe('[]');expect(localStorage.getItem('cargos')).toBeNull();expect(localStorage.getItem('idioma')).toBe('pt');expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('serializa alterações e não confirma antes da resposta',async()=>{
  let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve});let count=0;
  const fetch=vi.fn(async(_url:string,init?:RequestInit)=>{if(!init?.method)return Response.json({entries:{}});count++;if(count===1)await gate;return Response.json({ok:true})});vi.stubGlobal('fetch',fetch);
  const service=await import('../src/app/services/remoteStorageSync');await service.installRemoteStorageSync();localStorage.setItem('pacientes','[1]');await Promise.resolve();
  expect(service.getRemoteSaveState()).toBe('saving');localStorage.setItem('pacientes','[1,2]');expect(count).toBe(1);release();await service.flushRemoteStorage();
  expect(count).toBe(2);expect(service.getRemoteSaveState()).toBe('saved');expect(JSON.parse(String(fetch.mock.calls[2][1]?.body)).entries.pacientes).toBe('[1,2]');
 });
 it('retém falhas para tentativa explícita e impede confirmação falsa',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(Response.json({entries:{}})).mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(Response.json({ok:true}));vi.stubGlobal('fetch',fetch);
  const service=await import('../src/app/services/remoteStorageSync');await service.installRemoteStorageSync();localStorage.setItem('planos','[]');await expect(service.flushRemoteStorage()).rejects.toThrow();expect(service.getRemoteSaveState()).toBe('error');await service.retryRemoteStorage();await service.retryRemoteStorage();expect(service.getRemoteSaveState()).toBe('saved');
 });
 it('recusa inicialização quando o banco não está disponível',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));const service=await import('../src/app/services/remoteStorageSync');await expect(service.installRemoteStorageSync()).rejects.toThrow();
 });
});

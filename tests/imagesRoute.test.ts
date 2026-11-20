import {beforeEach,describe,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({loggedIn:true,role:'gerencia',objects:new Map<string,any>(),storedAvatar:'/existing.png',lastAvatar:undefined as unknown}));
vi.mock('../src/server/auth',()=>({
  requireSession:async (_:Request,roles?:string[])=>!state.loggedIn?{error:new Response('',{status:401})}:roles&&!roles.includes(state.role)?{error:new Response('',{status:403})}:{session:{user:{id:'test-user',email:'test@example.test',role:state.role,name:'Test'}}},
  assertSameOrigin:(r:Request)=>r.headers.get('origin')===new URL(r.url).origin,
  json:(body:unknown,init:ResponseInit={})=>new Response(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json'}}),
  audit:vi.fn(),sanitizeText:(v:unknown)=>String(v||''),normalizeEmail:(v:unknown)=>String(v||'').toLowerCase(),isStrongPassword:()=>true,hashPassword:vi.fn(),
}));
vi.mock("../src/server/runtime",()=>({env:{
  BUCKET:{put:async(k:string,bytes:Uint8Array,options:any)=>state.objects.set(k,{bytes,options}),head:async(k:string)=>state.objects.has(k)?{}:null,get:async(k:string)=>{const o=state.objects.get(k);return o?{body:o.bytes,httpMetadata:o.options.httpMetadata}:null;}},
  DB:{prepare:(sql:string)=>{const statement={bind:(...values:unknown[])=>{if(sql.startsWith('UPDATE users SET email'))state.lastAvatar=values[4];return statement;},first:async()=>sql.includes('id <>')?null:{id:'test-user',email:'test@example.test',role:'gerencia',active:1,avatar:state.storedAvatar,phone:'phone'},run:async()=>({})};return statement;},batch:async()=>[]},
}}));
import {GET,POST} from '../app/api/images/route';
import {PATCH} from '../app/api/users/route';
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
const upload=(kind='profile',body:BodyInit=png,origin='https://test.example',type='image/png')=>new Request('https://test.example/api/images?kind='+kind,{method:'POST',headers:{origin,'Content-Type':type},body});
beforeEach(()=>{state.loggedIn=true;state.role='gerencia';state.objects.clear();state.lastAvatar=undefined;});
describe('image persistence routes',()=>{
  it('uploads and reads the exact bytes through an authenticated URL',async()=>{
    const response=await POST(upload());expect(response.status).toBe(201);
    const {url}=await response.json() as any;
    const read=await GET(new Request('https://test.example'+url));
    expect(read.status).toBe(200);expect(read.headers.get('cache-control')).toBe('private, no-store');
    expect(new Uint8Array(await read.arrayBuffer())).toEqual(png);
  });
  it('requires authentication for both upload and download',async()=>{
    state.loggedIn=false;expect((await POST(upload())).status).toBe(401);
    expect((await GET(new Request('https://test.example/api/images?key=x'))).status).toBe(401);
  });
  it('checks origin, studio permission, bytes and size',async()=>{
    expect((await POST(upload('profile',png,'https://evil.example'))).status).toBe(403);
    state.role='fisio';expect((await POST(upload('studio'))).status).toBe(403);
    expect((await POST(upload('profile','<svg/>'))).status).toBe(400);
    expect((await POST(upload('profile',new Uint8Array(512_001)))).status).toBe(413);
  });
  it('does not disclose another user avatar to a restricted role',async()=>{
    const {url}=await (await POST(upload())).json() as any;
    state.role='fisio';
    expect((await GET(new Request('https://test.example'+url.replace('test-user','other-user')))).status).toBe(403);
  });
  it('preserves the photo when updating unrelated user fields',async()=>{
    const response=await PATCH(new Request('https://test.example/api/users',{method:'PATCH',headers:{origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify({name:'Test',email:'test@example.test',role:'gerencia'})}));
    expect(response.status).toBe(200);expect(state.lastAvatar).toBe('/existing.png');
  });
  it('accepts an uploaded own photo and rejects oversized invalid photos explicitly',async()=>{
    const {url}=await (await POST(upload())).json() as any;
    const update=(foto:string)=>PATCH(new Request('https://test.example/api/users',{method:'PATCH',headers:{origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify({name:'Test',email:'test@example.test',role:'gerencia',foto})}));
    expect((await update(url)).status).toBe(200);expect(state.lastAvatar).toBe(url);
    expect((await update('data:image/png;base64,'+'a'.repeat(500_001))).status).toBe(400);
  });
});

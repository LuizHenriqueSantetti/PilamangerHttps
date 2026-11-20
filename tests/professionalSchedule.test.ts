import {beforeEach,describe,it,expect,vi} from 'vitest';
import {agendaDateKey,professionalAgendaPeriod,shiftProfessionalAgenda} from '../src/app/utils/agendaCalendar';

const state=vi.hoisted(()=>({loggedIn:true,role:'gerencia',professionals:[] as any[],appointments:[] as any[],corrupt:false}));
vi.mock("../src/server/runtime",()=>({env:{DB:{prepare:()=>({all:async()=>({results:[{key:'profissionais',value:JSON.stringify(state.professionals)},{key:'agendamentos',value:state.corrupt?'bad json':JSON.stringify(state.appointments)}]})})}}}));
vi.mock('../src/server/auth',()=>({requireSession:async(_:Request,roles:string[])=>!state.loggedIn?{error:new Response('',{status:401})}:!roles.includes(state.role)?{error:new Response('',{status:403})}:{session:{user:{id:'user',role:state.role}}},json:(body:unknown,init:ResponseInit={})=>new Response(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}));
import {GET} from '../app/api/professional-schedule/route';
const query=(params='professionalId=pro-1&start=2026-10-01&end=2026-10-31')=>new Request('https://test.example/api/professional-schedule?'+params);
const appointment=(id:string,date:string,professorId='pro-1')=>({id,date,professorId,professor:'Ana',studentName:'Paciente '+id,startTime:'10:00',endTime:'11:00',status:'confirmado',room:'Sala 1',tipoAula:'regular',privateNote:'must never be returned'});
beforeEach(()=>{state.loggedIn=true;state.role='gerencia';state.corrupt=false;state.professionals=[{id:'pro-1',nome:'Ana'},{id:'pro-2',nome:'Bia'}];state.appointments=[];});
describe('professional schedule read-only API',()=>{
  it('requires a session and the existing team-view roles',async()=>{
    state.loggedIn=false;expect((await GET(query())).status).toBe(401);
    state.loggedIn=true;state.role='fisio';expect((await GET(query())).status).toBe(403);
    for(const role of ['gerencia','admin','recepcao']){state.role=role;expect((await GET(query())).status).toBe(200);}
  });
  it('returns only the selected professional and date range, sorted and minimized',async()=>{
    state.appointments=[appointment('later','2026-10-31'),appointment('other','2026-10-10','pro-2'),appointment('before','2026-09-30'),appointment('first','2026-10-01'),appointment('after','2026-11-01')];
    const before=JSON.stringify(state.appointments);
    const response=await GET(query());const data=await response.json() as any;
    expect(data.appointments.map((a:any)=>a.id)).toEqual(['first','later']);
    expect(data.appointments[0]).not.toHaveProperty('privateNote');
    expect(data.appointments[0]).not.toHaveProperty('studentId');
    expect(JSON.stringify(state.appointments)).toBe(before);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('uses names only for unduplicated legacy records without IDs',async()=>{
    state.appointments=[appointment('legacy','2026-10-01',''),appointment('wrong-id','2026-10-01','pro-2')];
    expect(((await (await GET(query())).json()) as any).appointments.map((a:any)=>a.id)).toEqual(['legacy']);
    state.professionals.push({id:'pro-3',nome:'Ana'});
    expect(((await (await GET(query())).json()) as any).appointments).toEqual([]);
  });
  it('does not invent dates for legacy records or drop cancelations from the source',async()=>{
    state.appointments=[appointment('undated',''),{...appointment('canceled','2026-10-22'),status:'cancelado'}];
    const data=await (await GET(query())).json() as any;
    expect(data.undatedCount).toBe(1);expect(data.appointments[0].status).toBe('cancelado');
  });
  it.each(['professionalId=pro-1&start=2026-02-30&end=2026-03-01','professionalId=pro-1&start=2026-11-01&end=2026-10-01','professionalId=pro-1&start=2026-01-01&end=2026-12-31','start=2026-10-01&end=2026-10-31'])('rejects invalid or unbounded query %s',async params=>expect((await GET(query(params))).status).toBe(400));
  it('returns not found for missing/deleted professionals and a safe error for malformed storage',async()=>{
    state.professionals[0].deletedAt='2026-10-01';expect((await GET(query())).status).toBe(404);
    state.corrupt=true;expect((await GET(query())).status).toBe(503);
  });
});

describe('month/week period selection',()=>{
  it('uses all calendar days, including leap years',()=>{
    const period=professionalAgendaPeriod(new Date(2028,1,15),'mes');
    expect(period.start).toBe('2028-02-01');expect(period.end).toBe('2028-02-29');expect(period.dates).toHaveLength(29);
  });
  it('does not skip February when navigating from January 31',()=>{
    expect(agendaDateKey(shiftProfessionalAgenda(new Date(2026,0,31),'mes',1))).toBe('2026-02-01');
    expect(agendaDateKey(shiftProfessionalAgenda(new Date(2026,0,31),'mes',-1))).toBe('2025-12-01');
  });
  it('preserves the Sunday-to-Saturday week',()=>{
    const period=professionalAgendaPeriod(new Date(2026,9,22),'semana');
    expect(period.start).toBe('2026-10-18');expect(period.end).toBe('2026-10-24');expect(period.dates).toHaveLength(7);
  });
});

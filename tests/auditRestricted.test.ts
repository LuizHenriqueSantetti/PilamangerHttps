import {afterEach,describe,expect,it,vi} from 'vitest';
import {authService} from '../src/app/services/authService';
import {auditService} from '../src/app/services/auditService';
afterEach(()=>vi.restoreAllMocks());
describe('restricted profile audit writes',()=>{
 it('does not mix management-only audit aggregates into reception writes',()=>{
  vi.spyOn(authService,'getCurrentUser').mockReturnValue({email:'qa@example.test',name:'QA',role:'recepcao',ativo:true} as ReturnType<typeof authService.getCurrentUser>);
  const entry=auditService.record({action:'Editou paciente',actionType:'update',module:'Pacientes'});
  expect(entry.userEmail).toBe('qa@example.test');expect(localStorage.getItem('auditTrail')).toBeNull();
 });
 it('retains the management audit view using the authenticated identity',()=>{
  vi.spyOn(authService,'getCurrentUser').mockReturnValue({email:'qa@example.test',name:'QA',role:'gerencia',ativo:true} as ReturnType<typeof authService.getCurrentUser>);
  auditService.record({action:'Editou paciente',actionType:'update',module:'Pacientes'});
  expect(JSON.parse(localStorage.getItem('auditTrail')!)[0].userName).toBe('QA');
 });
});

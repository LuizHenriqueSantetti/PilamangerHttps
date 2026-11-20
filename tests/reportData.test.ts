import {describe,it,expect,vi} from 'vitest';
import {getReportData} from '../src/app/services/reportDataService';
describe('relatórios com dados persistidos e datas civis',()=>{
 it('inclui os registros do primeiro dia do período e mantém o dia da semana',()=>{
  vi.stubEnv('TZ','America/Sao_Paulo');
  try {
   localStorage.setItem('pacientes',JSON.stringify([{id:'p',nome:'Paciente fictício',status:'ativo',dataCadastro:'2026-11-20'}]));
   localStorage.setItem('agendamentos',JSON.stringify([{id:'a',date:'2026-11-20',status:'confirmado'},{id:'b',date:'2026-11-20',status:'cancelado'},{id:'c',date:'2026-11-21',status:'pendente'}]));
   const report=getReportData('2026-11-20','2026-11-20',['#087F8C']);
   expect(report.dadosGerais.alunosNovos).toBe(1);
   expect(report.appointmentSummary).toEqual({total:2,confirmados:1,pendentes:0,cancelados:1});
   expect(report.ocupacaoDiaSemana.find(x=>x.dia==='Sex')).toMatchObject({aulas:1,cancelados:1});
   expect(report.ocupacaoDiaSemana.find(x=>x.dia==='Qui')).toMatchObject({aulas:0,cancelados:0});
  } finally {vi.unstubAllEnvs();}
 });
 it('não desloca matrículas do primeiro dia para o mês anterior',()=>{
  vi.stubEnv('TZ','America/Sao_Paulo');
  try {
   localStorage.setItem('pacientes',JSON.stringify([{id:'p',status:'ativo',dataCadastro:'2026-11-01'}]));
   const report=getReportData('2026-11-01','2026-11-30',['#087F8C']);
   expect(report.matriculasMensais.find(x=>x.mes==='Nov')?.novos).toBe(1);
   expect(report.matriculasMensais.find(x=>x.mes==='Out')?.novos).toBe(0);
  } finally {vi.unstubAllEnvs();}
 });
 it('retorna contadores zerados quando não existem agendamentos',()=>{
  expect(getReportData('2026-11-01','2026-11-30',['#087F8C']).appointmentSummary).toEqual({total:0,confirmados:0,pendentes:0,cancelados:0});
 });
});

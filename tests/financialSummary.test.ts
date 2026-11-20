import {describe,it,expect} from 'vitest';
import {summarizeFinancialEntries,type FinancialEntry} from '../src/app/services/financialLedger';
const entries: FinancialEntry[] = [
 {id:'a',data:'2026-10-15',descricao:'Receita fictícia anterior',tipo:'receita',valor:100,categoria:'Planos'},
 {id:'b',data:'2026-11-20',descricao:'Receita fictícia atual',tipo:'receita',valor:320,categoria:'Planos'},
 {id:'c',data:'2026-11-20',descricao:'Despesa fictícia',tipo:'despesa',valor:20,categoria:'Comissões'},
];
describe('resumo do período efetivamente exportado',()=>{
 it('inclui lançamentos de meses diferentes que aparecem no relatório',()=>{
  expect(summarizeFinancialEntries(entries)).toEqual({receitas:420,despesas:20,lucro:400});
 });
 it('respeita o filtro de despesas aplicado às linhas',()=>{
  expect(summarizeFinancialEntries(entries.filter(item=>item.tipo==='despesa'))).toEqual({receitas:0,despesas:20,lucro:-20});
 });
 it('não inventa valores quando não existem lançamentos',()=>{
  expect(summarizeFinancialEntries([])).toEqual({receitas:0,despesas:0,lucro:0});
 });
});

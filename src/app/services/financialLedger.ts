export type FinancialEntry = { id: string; data: string; descricao: string; tipo: string; valor: number; categoria: string };
type RecordData = Record<string, any>;
export function buildFinancialLedger(transactions: RecordData[], payments: RecordData[], commissions: RecordData[]): FinancialEntry[] {
  const result = new Map<string, FinancialEntry>();
  const add = (key: string, item: RecordData, tipo: string, fallback: string) => {
    const valor = Number(item.valor ?? item.value ?? item.total ?? 0);
    const data = String(item.dataPagamento || item.pagoEm || item.data || item.date || item.createdAt || '').slice(0, 10);
    if (!Number.isFinite(valor) || valor < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
    result.set(key, { id: key, data, descricao: String(item.descricao || item.pacienteNome || fallback), tipo, valor, categoria: String(item.categoria || fallback) });
  };
  transactions.forEach(item => {
    if (['cancelado', 'pendente', 'atrasado', 'estornado'].includes(item.status)) return;
    const tipo = ['despesa', 'saida'].includes(item.tipo) ? 'despesa' : item.tipo === 'receita' || ['pago', 'recebido'].includes(item.status) ? 'receita' : '';
    if (tipo) add(item.pagamentoId ? 'pagamento:' + item.pagamentoId : item.comissaoId ? 'comissao:' + item.comissaoId : 'transacao:' + item.id, item, tipo, tipo === 'receita' ? 'Receitas' : 'Despesas');
  });
  payments.filter(p => ['pago', 'recebido'].includes(p.status)).forEach(p => add('pagamento:' + p.id, p, 'receita', 'Planos'));
  commissions.filter(c => c.status === 'pago').forEach(c => add('comissao:' + c.id, { ...c, valor: c.comissao, descricao: 'Comissão · ' + c.fisioterapeuta }, 'despesa', 'Comissões'));
  return [...result.values()].sort((a, b) => b.data.localeCompare(a.data));
}
export function readFinancialLedger(): FinancialEntry[] {
  const read = (key: string) => { try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } };
  return buildFinancialLedger(read('transacoesFinanceiras'), read('pagamentos'), read('detalheAulasPagamento'));
}

type Data = Record<string, any>;
export function calculateCommission(payment: Data, plan: Data, professional: Data, used: number) {
  const classes = Number(payment.quantidadeAulas ?? plan.quantidadeAulas);
  const amount = Number(payment.valor);
  const percent = Number(professional.comissaoPercentual || 0);
  const fixed = Number(professional.valorFixoAula || 0);
  if (!['pago', 'recebido'].includes(payment.status)) throw new Error('A cobrança precisa estar recebida.');
  if (!Number.isInteger(classes) || classes < 1 || used >= classes) throw new Error('A cobrança não possui aulas disponíveis para comissionamento.');
  if (![amount, percent, fixed].every(Number.isFinite) || amount <= 0 || percent < 0 || percent > 100 || fixed < 0) throw new Error('Revise os valores do plano e a regra de comissão.');
  if (!['fixa', 'percentual', 'hibrida'].includes(professional.tipoComissao)) throw new Error('Configure a comissão no cadastro do profissional.');
  const valorAula = Math.round(amount / classes * 100) / 100;
  const comissao = Math.round(((professional.tipoComissao !== 'fixa' ? valorAula * percent / 100 : 0) + (professional.tipoComissao !== 'percentual' ? fixed : 0)) * 100) / 100;
  return { valorAula, comissao, quantidadeAulas: classes, regra: { tipo: professional.tipoComissao, percentual: percent, fixo: fixed } };
}

import { env } from "../../../src/server/runtime";
import { assertSameOrigin, requireSession, json, audit } from '../../../src/server/auth';
import { calculateCommission } from '../../../src/server/billingRules';

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return json({ error: 'Origem inválida.' }, { status: 403 });
  const auth = await requireSession(request);
  if ('error' in auth) return auth.error;
  if (!['gerencia', 'admin'].includes(auth.session.user.role)) return json({ error: 'Sem permissão para movimentações financeiras.' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !['receive', 'accrue', 'pay'].includes(String(body.action))) return json({ error: 'Operação inválida.' }, { status: 400 });
  const rows = await env.DB.prepare("SELECT key, value FROM app_storage WHERE key IN ('pagamentos','planos','profissionais','agendamentos','detalheAulasPagamento')").all<{ key: string; value: string }>();
  const raw = Object.fromEntries((rows.results || []).map(r => [r.key, r.value]));
  const read = (key: string): any[] => { const value = JSON.parse(raw[key] || '[]'); if (!Array.isArray(value)) throw new Error('Dados incompatíveis.'); return value; };
  try {
    const payments = read('pagamentos'), commissions = read('detalheAulasPagamento');
    const now = new Date().toISOString(), today = now.slice(0, 10);
    let key: string, next: any[];
    if (body.action === 'receive') {
      const payment = payments.find(p => String(p.id) === body.id);
      if (!payment || !['pendente', 'atrasado'].includes(payment.status)) throw new Error('Cobrança indisponível ou já recebida.');
      if (!Number.isFinite(Number(payment.valor)) || Number(payment.valor) <= 0) throw new Error('Valor da cobrança inválido.');
      if (!['pix', 'dinheiro', 'cartao', 'transferencia'].includes(String(body.method))) throw new Error('Selecione a forma de pagamento.');
      const plan = read('planos').find(p => String(p.id) === String(payment.planoId));
      key = 'pagamentos';
      next = payments.map(p => p === payment ? { ...p, status: 'pago', dataPagamento: today, formaPagamento: body.method, recebidoPor: auth.session.user.name, quantidadeAulas: p.quantidadeAulas ?? plan?.quantidadeAulas, updatedAt: now } : p);
    } else if (body.action === 'accrue') {
      if (body.confirmed !== true) throw new Error('Confirme que a aula foi realizada.');
      const appointment = read('agendamentos').find(a => String(a.id) === body.appointmentId);
      const payment = payments.find(p => String(p.id) === body.paymentId);
      if (!appointment || appointment.status !== 'confirmado' || !(appointment.date || appointment.data) || (appointment.date || appointment.data) > today) throw new Error('Selecione uma aula confirmada, com data de hoje ou anterior.');
      if (!payment || String(payment.pacienteId) !== String(appointment.studentId || appointment.pacienteId)) throw new Error('A cobrança deve pertencer ao paciente desta aula.');
      if (commissions.some(c => String(c.agendamentoId) === String(appointment.id))) throw new Error('Esta aula já possui comissão registrada.');
      const professional = read('profissionais').find(p => String(p.id) === String(appointment.professorId || appointment.profissionalId));
      const plan = read('planos').find(p => String(p.id) === String(payment.planoId));
      if (!professional || !plan) throw new Error('Vincule a aula a um profissional e a cobrança a um plano.');
      const calculation = calculateCommission(payment, plan, professional, commissions.filter(c => String(c.pagamentoId) === String(payment.id)).length);
      key = 'detalheAulasPagamento';
      next = [...commissions, { id: crypto.randomUUID(), agendamentoId: String(appointment.id), pagamentoId: String(payment.id), profissionalId: String(professional.id), paciente: payment.pacienteNome, fisioterapeuta: professional.nome, data: appointment.date || appointment.data, ...calculation, status: 'pendente', createdAt: now, atualizadoPor: auth.session.user.id }];
    } else {
      const commission = commissions.find(c => String(c.id) === body.id);
      if (!commission || commission.status === 'pago') throw new Error('Comissão indisponível ou já paga.');
      if (!Number.isFinite(Number(commission.comissao)) || Number(commission.comissao) < 0) throw new Error('Valor da comissão inválido.');
      key = 'detalheAulasPagamento';
      next = commissions.map(c => c === commission ? { ...c, status: 'pago', pagoEm: today, atualizadoEm: now, atualizadoPor: auth.session.user.id } : c);
    }
    // Compare every source read in the same statement: concurrent edits cannot silently replace this calculation.
    const sourceKeys = ['pagamentos', 'planos', 'profissionais', 'agendamentos', 'detalheAulasPagamento'];
    const conditions = sourceKeys.map(() => "COALESCE((SELECT value FROM app_storage WHERE key = ?), '') = ?").join(' AND ');
    const bindings = sourceKeys.flatMap(k => [k, raw[k] ?? '']);
    const result = await env.DB.prepare("INSERT INTO app_storage (key,value,updated_at) SELECT ?,?,? WHERE " + (conditions || '1') + " ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
      .bind(key, JSON.stringify(next), now, ...bindings).run();
    if (!result.meta.changes) return json({ error: 'Os dados mudaram. Atualize a página e tente novamente.' }, { status: 409 });
    await audit(auth.session.user.id, 'Movimentação financeira: ' + body.action, 'Financeiro');
    return json({ entries: { [key]: JSON.stringify(next) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const safe = /^(Confirme|Selecione|Vincule|Configure|Revise|Esta aula|A cobrança|Cobrança indisponível|Comissão indisponível|Valor da|Dados incompatíveis)/.test(message);
    return json({ error: safe ? message : 'Não foi possível concluir a operação. Tente novamente.' }, { status: safe ? 400 : 500 });
  }
}

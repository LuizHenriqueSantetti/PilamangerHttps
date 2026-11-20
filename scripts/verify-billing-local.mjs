// Only synthetic local fixtures; preserves existing records and never targets hosted databases.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const qa = JSON.parse(readFileSync(new URL('../.private/qa.json', import.meta.url), 'utf8'));
assert.equal(qa.origin, 'http://127.0.0.1:4192');
let cookie = '';
async function call(path, method = 'GET', body, authenticated = true) {
  const response = await fetch(qa.origin + path, { method, headers: { Origin: qa.origin, 'Content-Type': 'application/json', Cookie: authenticated ? cookie : '' }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
function check(label, actual, expected) { assert.deepEqual(actual, expected, label); console.log('PASS ' + label); }
check('Unauthenticated financial mutation', (await call('/api/billing', 'POST', { action: 'pay', id: 'x' }, false)).status, 401);
const login = await call('/api/auth/login', 'POST', { email: qa.email, password: qa.newPassword });
check('Local QA login', login.status, 200); cookie = login.cookie;
const snapshot = (await call('/api/storage')).data.entries;
const records = key => JSON.parse(snapshot[key] || '[]');
const tag = 'billing-qa-' + Date.now(), today = new Date().toISOString().slice(0, 10);
const plan = { id: tag, nome: 'Plano QA financeiro', descricao: 'Teste local', preco: 240, quantidadeAulas: 8, duracao: 'mensal', beneficios: [], ativo: true, cor: '#087F8C' };
const professional = { id: tag, nome: 'Profissional QA financeiro', tipoComissao: 'percentual', comissaoPercentual: 30, valorFixoAula: 0, status: 'ativo' };
const payment = { id: tag, pacienteId: tag, pacienteNome: 'Paciente QA financeiro', planoId: tag, plano: plan.nome, valor: 240, vencimento: today, status: 'pendente', createdAt: today };
const appointment = { id: tag, studentId: tag, studentName: payment.pacienteNome, professorId: tag, professor: professional.nome, date: today, status: 'confirmado', startTime: '08:00', endTime: '09:00' };
const fixtures = { planos: plan, profissionais: professional, pagamentos: payment, agendamentos: appointment };
check('Append synthetic fixtures', (await call('/api/storage', 'POST', { entries: Object.fromEntries(Object.entries(fixtures).map(([k,v]) => [k, JSON.stringify([...records(k), v])])) })).status, 200);
check('Reject accrual on unpaid charge', (await call('/api/billing', 'POST', { action: 'accrue', appointmentId: tag, paymentId: tag, confirmed: true })).status, 400);
check('Receive payment', (await call('/api/billing', 'POST', { action: 'receive', id: tag, method: 'pix' })).status, 200);
check('Reject double receipt', (await call('/api/billing', 'POST', { action: 'receive', id: tag, method: 'pix' })).status, 400);
check('Require explicit attendance confirmation', (await call('/api/billing', 'POST', { action: 'accrue', appointmentId: tag, paymentId: tag })).status, 400);
const accrue = await call('/api/billing', 'POST', { action: 'accrue', appointmentId: tag, paymentId: tag, confirmed: true });
check('Accrue commission', accrue.status, 200);
const commission = JSON.parse(accrue.data.entries.detalheAulasPagamento).find(c => c.agendamentoId === tag);
check('Commission amount calculated server-side', commission.comissao, 9);
check('Reject duplicate class', (await call('/api/billing', 'POST', { action: 'accrue', appointmentId: tag, paymentId: tag, confirmed: true })).status, 400);
check('Pay commission', (await call('/api/billing', 'POST', { action: 'pay', id: commission.id })).status, 200);
check('Reject duplicate payout', (await call('/api/billing', 'POST', { action: 'pay', id: commission.id })).status, 400);
check('Reject bypass of commission endpoint', (await call('/api/storage', 'POST', { entries: { detalheAulasPagamento: '[]' } })).status, 403);
check('Preserve received history', (await call('/api/storage', 'POST', { entries: { pagamentos: '[]' } })).status, 403);
check('Reject removal of received history', (await call('/api/storage', 'POST', { removals: ['pagamentos'] })).status, 403);
await call('/api/auth/logout', 'POST', {});
cookie = (await call('/api/auth/login', 'POST', { email: qa.email, password: qa.newPassword })).cookie;
const persisted = (await call('/api/storage')).data.entries;
check('Receipt survives new session', JSON.parse(persisted.pagamentos).find(p => p.id === tag).status, 'pago');
check('Payout survives new session', JSON.parse(persisted.detalheAulasPagamento).find(c => c.id === commission.id).status, 'pago');
await call('/api/auth/logout', 'POST', {});
console.log('Synthetic local financial fixtures retained for visual QA.');

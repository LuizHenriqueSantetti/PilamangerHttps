import { calculateCommission } from './billingRules';
import { studioDate } from './operationalDates';

export const DEMO_IMPORT_ID = 'authorized-demo-history-2026-10-22';
export const DEMO_IMPORT_DEADLINE = '2026-10-23T03:00:00.000Z';
export const DEMO_KEYS = ['pacientes', 'planos', 'profissionais', 'planosAtribuidos', 'pagamentos', 'agendamentos', 'detalheAulasPagamento'] as const;
export const DEMO_NOTE = 'DEMONSTRAÇÃO — apenas o nome foi fornecido. Documentos, contatos, condições clínicas, datas, aulas e movimentações são fictícios, não representam esta pessoa. Não contatar, cobrar ou transferir dinheiro.';

export const DEMO_SCENARIOS = [
  { nome: 'Natanael', slug: 'natanael', birth: '2003-11-17', joined: '2026-09-01', due: '2026-09-05', paid: '2026-09-03', method: 'pix', plan: 'Essencial', pro: 'Kaue Cardoso', date: '2026-09-10', time: '08:00', room: 'Sala 1', problem: 'Sedentarismo; cenário sem diagnóstico.', pain: 'Desconforto lombar após longos períodos sentado.', goal: 'Mobilidade e consciência corporal.' },
  { nome: 'Felipe Prior', slug: 'felipe-prior', birth: '1985-05-12', joined: '2026-09-08', due: '2026-09-10', paid: '2026-09-10', method: 'cartao', plan: 'Equilíbrio', pro: 'Felipe Donatoni', date: '2026-09-17', time: '09:00', room: 'Sala 2', problem: 'Rigidez muscular; cenário fictício.', pain: 'Tensão cervical após trabalho em computador.', goal: 'Flexibilidade e relaxamento.' },
  { nome: 'Paulo Estopilha', slug: 'paulo-estopilha', birth: '1966-12-03', joined: '2026-09-20', due: '2026-09-25', paid: '2026-09-22', method: 'transferencia', plan: 'Intensivo', pro: 'Gabriel Benine', date: '2026-09-24', time: '10:00', room: 'Sala VIP', problem: 'Queixa articular em cenário fictício; sem diagnóstico real.', pain: 'Desconforto leve nos joelhos ao subir escadas.', goal: 'Equilíbrio e fortalecimento supervisionado.' },
  { nome: 'Luigi Gabriel', slug: 'luigi-gabriel', birth: '2006-08-30', joined: '2026-10-01', due: '2026-10-05', paid: '2026-10-02', method: 'dinheiro', plan: 'Essencial', pro: 'Kaue Cardoso', date: '2026-10-08', time: '11:00', room: 'Sala 1', problem: 'Nenhuma condição crônica no cenário fictício.', pain: 'Encurtamento muscular após atividades esportivas.', goal: 'Alongamento e coordenação.' },
  { nome: 'Gabriela Comiram', slug: 'gabriela-comiram', birth: '1991-10-27', joined: '2026-10-05', due: '2026-10-10', paid: '2026-10-07', method: 'pix', plan: 'Equilíbrio', pro: 'Felipe Donatoni', date: '2026-10-15', time: '14:00', room: 'Sala 2', problem: 'Estresse e tensão muscular em cenário fictício.', pain: 'Desconforto leve nos ombros.', goal: 'Postura, respiração e bem-estar.' },
  { nome: 'Jean', slug: 'jean', birth: '1978-02-19', joined: '2026-10-09', due: '2026-10-15', paid: '', method: '', plan: 'Intensivo', pro: 'Gabriel Benine', date: '2026-10-29', time: '15:00', room: 'Sala VIP', problem: 'Baixo condicionamento; cenário fictício.', pain: 'Cansaço e rigidez após ficar muito tempo em pé.', goal: 'Condicionamento gradual e mobilidade.' },
  { nome: 'Victor', slug: 'victor', birth: '1998-03-06', joined: '2026-10-12', due: '2026-10-28', paid: '', method: '', plan: 'Essencial', pro: 'Kaue Cardoso', date: '2026-11-05', time: '16:00', room: 'Sala 1', problem: 'Sem diagnóstico no cenário fictício.', pain: 'Desconforto no punho após uso prolongado de computador.', goal: 'Consciência corporal e fortalecimento.' },
  { nome: 'Kaue Correia', slug: 'kaue-correia', birth: '1989-07-21', joined: '2026-10-19', due: '2026-11-02', paid: '', method: '', plan: 'Equilíbrio', pro: 'Gabriel Benine', date: '2026-11-12', time: '17:00', room: 'Sala 2', problem: 'Retorno à atividade física em cenário fictício.', pain: 'Rigidez no quadril ao permanecer sentado.', goal: 'Estabilidade e flexibilidade.' },
];

function cpf(index: number) {
  const digits = String(910000000 + index).split('').map(Number);
  for (let length = 9; length < 11; length++) {
    const value = digits.reduce((sum, digit, i) => sum + digit * (length + 1 - i), 0) * 10 % 11;
    digits.push(value === 10 ? 0 : value);
  }
  return digits.join('');
}
function monthsLater(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
}

export function buildDemoHistory(source: Record<string, any[]>, actor: string, now: Date) {
  if (now.toISOString() >= DEMO_IMPORT_DEADLINE || studioDate(now) !== '2026-10-22') throw new Error('A autorização temporária expirou.');
  const result: Record<string, any[]> = Object.fromEntries(DEMO_KEYS.map(key => [key, [...(source[key] || [])]]));
  const insertedAt = now.toISOString();
  for (const [index, scenario] of DEMO_SCENARIOS.entries()) {
    const id = `${DEMO_IMPORT_ID}-${index + 1}`;
    const email = `${scenario.slug}.historico@example.com`;
    if (result.pacientes.some(p => p.id === id || p.email?.toLowerCase() === email || String(p.cpf || '').replace(/\D/g, '') === cpf(index + 1) || String(p.nome || '').trim().toLowerCase() === scenario.nome.toLowerCase())) throw new Error('Já existe um dos clientes deste lote. Nenhum dado foi alterado.');
    const plan = source.planos.find(p => p.nome === `DEMO — ${scenario.plan}` && p.ativo !== false);
    const pro = source.profissionais.find(p => p.nome === scenario.pro && p.status === 'ativo' && !p.deletedAt && String(p.registroProfissional).startsWith('DEMO-'));
    if (!plan || !pro || !Number.isFinite(Number(plan.preco)) || Number(plan.preco) <= 0 || !Number.isInteger(plan.quantidadeAulas) || plan.quantidadeAulas < 1) throw new Error('Confira os planos e profissionais de demonstração antes de importar.');
    const validUntil = monthsLater(scenario.joined);
    const expired = validUntil < studioDate(now);
    const age = 2026 - Number(scenario.birth.slice(0, 4)) - (scenario.birth.slice(5) > '10-22' ? 1 : 0);
    const metadata = { demonstration: true, demoImportId: DEMO_IMPORT_ID, importedAt: insertedAt, importedBy: actor };
    result.pacientes.push({ id, nome: scenario.nome, cpf: cpf(index + 1), idade: age, dataNascimento: scenario.birth, dataCadastro: scenario.joined, plano: plan.nome, planoId: String(plan.id), aulasRestantes: expired ? 0 : plan.quantidadeAulas - (scenario.paid ? 1 : 0), planoValidoAte: validUntil, email, telefone: `1190000010${index + 1}`, endereco: `Rua Exemplo, ${201 + index} — Cidade Fictícia, SC (endereço fictício)`, descricaoEspecial: DEMO_NOTE, observacoes: { deficiencias: 'SIMULAÇÃO: sem deficiência relatada; sem avaliação real.', problemaSaude: `SIMULAÇÃO: ${scenario.problem}`, dores: `SIMULAÇÃO: ${scenario.pain}`, queixas: DEMO_NOTE, objetivos: `SIMULAÇÃO: ${scenario.goal}` }, status: 'ativo', privacyConsent: { accepted: true, acceptedAt: insertedAt, version: '2.0', scope: 'paciente', demonstration: true, authorizedBy: actor, note: 'Aceite autorizado somente para teste; não é consentimento dos titulares.' }, ...metadata });
    result.planosAtribuidos.push({ id: `${id}-plan`, pacienteId: id, pacienteNome: scenario.nome, planoId: String(plan.id), nomePlano: plan.nome, status: expired ? 'encerrado' : 'ativo', quantidadeAulas: plan.quantidadeAulas, aulasRestantes: expired ? 0 : plan.quantidadeAulas - (scenario.paid ? 1 : 0), dataInicio: scenario.joined, dataVencimento: validUntil, createdAt: insertedAt, ...(expired ? { endedAt: `${validUntil}T15:00:00Z` } : {}), responsavel: 'Importação única de demonstração', ...metadata });
    const payment = { id: `${id}-payment`, pacienteId: id, pacienteNome: scenario.nome, planoId: String(plan.id), plano: plan.nome, valor: Number(plan.preco), quantidadeAulas: plan.quantidadeAulas, vencimento: scenario.due, status: scenario.paid ? 'pago' : 'pendente', ...(scenario.paid ? { dataPagamento: scenario.paid, formaPagamento: scenario.method, recebidoPor: 'SIMULAÇÃO — sem recebimento real' } : {}), descricao: `DEMONSTRAÇÃO — Plano ${plan.nome}`, createdAt: insertedAt, responsavel: actor, ...metadata };
    result.pagamentos.push(payment);
    const start = Number(scenario.time.slice(0, 2));
    const appointment = { id: `${id}-appointment`, studentId: id, studentName: scenario.nome, professorId: String(pro.id), professor: pro.nome, date: scenario.date, day: new Date(`${scenario.date}T12:00:00Z`).getUTCDay(), startTime: scenario.time, endTime: `${String(start + 1).padStart(2, '0')}:00`, room: scenario.room, status: scenario.paid ? 'confirmado' : 'pendente', tipoAula: 'regular', createdAt: insertedAt, observacoes: DEMO_NOTE, ...metadata };
    result.agendamentos.push(appointment);
    if (scenario.paid) result.detalheAulasPagamento.push({ id: `${id}-commission`, agendamentoId: appointment.id, pagamentoId: payment.id, profissionalId: String(pro.id), paciente: scenario.nome, fisioterapeuta: pro.nome, data: scenario.date, ...calculateCommission(payment, plan, pro, 0), status: 'pendente', createdAt: insertedAt, atualizadoPor: actor, ...metadata });
  }
  return { collections: result, summary: { clients: 8, paymentsReceived: 5, paymentsPending: 3, appointments: 8, historicalAppointments: 5, commissions: 5, received: DEMO_SCENARIOS.filter(s => s.paid).reduce((sum, s) => sum + Number(source.planos.find(p => p.nome === `DEMO — ${s.plan}`).preco), 0) } };
}

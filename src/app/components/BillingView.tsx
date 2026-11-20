import { useEffect, useState } from 'react';
import { Wallet, Clock, CircleCheck, FileText, X } from 'lucide-react';
import { billingAction } from '../services/remoteStorageSync';
import { performAction } from '../utils/notifications';
import { PagamentosView } from './PagamentosView';
import { RoleType } from '../utils/permissions';

const money = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const read = (key: string): any[] => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
export function BillingView({ commissions = false, isDark, userRole }: { commissions?: boolean; isDark: boolean; userRole: RoleType }) {
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [method, setMethod] = useState('pix');
  const [appointmentId, setAppointmentId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [details, setDetails] = useState(false);
  useEffect(() => {
    const refresh = () => setVersion(v => v + 1);
    window.addEventListener('pilamanager:data-changed', refresh);
    return () => window.removeEventListener('pilamanager:data-changed', refresh);
  }, []);
  const rows = read(commissions ? 'detalheAulasPagamento' : 'pagamentos');
  const editable = userRole === 'gerencia' || userRole === 'admin';
  const paid = (row: any) => ['pago', 'recebido'].includes(row.status);
  const amount = (row: any) => Number(commissions ? row.comissao : row.valor) || 0;
  const filtered = rows.filter(r => (status === 'todos' || (status === 'pago' ? paid(r) : !paid(r))) && (String(r.fisioterapeuta || '') + ' ' + String(r.pacienteNome || r.paciente || '') + ' ' + String(r.plano || '')).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const appointments = read('agendamentos').filter(a => {
    return a.status === 'confirmado' && (a.date || a.data)
      && (a.date || a.data) <= new Date().toISOString().slice(0, 10)
      && !rows.some(c => String(c.agendamentoId) === String(a.id));
  });
  const appointment = appointments.find(a => String(a.id) === appointmentId);
  const payments = read('pagamentos').filter(p => paid(p) && String(p.pacienteId) === String(appointment?.studentId || appointment?.pacienteId));
  const run = async (payload: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const message = payload.action === 'receive' ? 'Pagamento recebido.' : payload.action === 'pay' ? 'Comissão paga.' : 'Comissão apurada.';
      if (await performAction('billing', () => billingAction(payload), message)) { setSelected(null); setConfirmed(false); }
    }
    finally { setBusy(false); }
  };
  return <div className="pm-billing" data-version={version}>
    <header className="pm-page-heading"><div><p className="pm-eyebrow">{commissions ? 'EQUIPE E REPASSES' : 'RECEBIMENTOS'}</p><h1>{commissions ? 'Comissionamento' : 'Cobranças'}</h1><p className="pm-help">{commissions ? 'Comissões por aula, vinculadas a cobranças recebidas. Valores pagos entram como despesa no Financeiro.' : 'Cobranças geradas pelos planos dos pacientes. Recebimentos entram no Financeiro e nos relatórios.'}</p></div>
      {commissions && editable && <button className="pm-button-primary" onClick={() => { setSelected({ new: true }); setAppointmentId(''); setPaymentId(''); }}>Registrar aula realizada</button>}
    </header>
    <div className="pm-kpi-grid">
      {[
        { label: 'Total', value: rows.reduce((s, r) => s + amount(r), 0), icon: Wallet, color: 'var(--pm-primary)' },
        { label: commissions ? 'A pagar' : 'A receber', value: rows.filter(r => !paid(r)).reduce((s, r) => s + amount(r), 0), icon: Clock, color: '#b9801b' },
        { label: commissions ? 'Pago aos profissionais' : 'Recebido', value: rows.filter(paid).reduce((s, r) => s + amount(r), 0), icon: CircleCheck, color: '#249774' },
      ].map(({ label, value, icon: Icon, color }) => <section className="pm-kpi" key={label} style={{ '--metric-color': color } as React.CSSProperties}><div className="pm-kpi-icon"><Icon size={26}/></div><p className="pm-kpi-top">{label}</p><p className="pm-kpi-value">{money(value)}</p></section>)}
    </div>
    {message && <p className="pm-feedback" role="status">{message}</p>}
    <div className="pm-billing-filters"><input aria-label="Pesquisar registros" placeholder="Pesquisar registros" value={search} onChange={e => setSearch(e.target.value)}/><select aria-label="Situação" value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todas as situações</option><option value="pendente">Pendentes</option><option value="pago">{commissions ? 'Pagos' : 'Recebidos'}</option></select></div>
    <div className="pm-data-table"><table><thead><tr><th>{commissions ? 'Profissional / paciente' : 'Paciente / plano'}</th><th>{commissions ? 'Data da aula' : 'Vencimento'}</th>{commissions && <th>Base da aula</th>}<th>{commissions ? 'Comissão' : 'Valor'}</th><th>Situação</th><th>Ação</th></tr></thead><tbody>
      {filtered.map(row => <tr key={row.id}><td><strong>{commissions ? row.fisioterapeuta : row.pacienteNome}</strong><small>{commissions ? row.paciente : row.plano}</small></td><td>{String(commissions ? row.data || '' : row.vencimento || '').split('-').reverse().join('/') || '—'}</td>{commissions && <td>{money(row.valorAula)}</td>}<td>{money(amount(row))}</td><td><span className="pm-status" data-active={paid(row)}>{paid(row) ? (commissions ? 'Pago' : 'Recebido') : 'Pendente'}</span></td><td>{!paid(row) && editable && <button className="pm-button-secondary" disabled={busy} onClick={() => setSelected(row)}>{commissions ? 'Registrar repasse' : 'Receber'}</button>}</td></tr>)}
      {!filtered.length && <tr><td colSpan={commissions ? 6 : 5}><div className="pm-empty"><FileText size={24}/>{commissions ? 'Nenhuma comissão neste filtro. Registre uma aula realizada para iniciar.' : 'Nenhuma cobrança neste filtro. Vincule um plano a um paciente para gerar uma cobrança.'}</div></td></tr>}
    </tbody></table></div>
    {commissions && userRole === 'gerencia' && <><button className="pm-button-secondary mt-4" onClick={() => setDetails(!details)}>{details ? 'Ocultar detalhes' : 'Regras, dados bancários e relatórios'}</button>{details && <PagamentosView isDark={isDark} userRole={userRole}/>}</>}
    {selected && <div className="pm-modal-overlay pm-panel-overlay"><section className="pm-financial-dialog pm-panel" role="dialog" aria-modal="true" aria-label={selected.new ? 'Registrar aula realizada' : 'Confirmar movimentação'}>
      <header className="pm-panel-header flex items-start justify-between"><div className="pm-panel-heading"><span className="pm-panel-heading-icon"><Wallet aria-hidden="true"/></span><h2>{selected.new ? 'Registrar aula realizada' : commissions ? 'Registrar repasse' : 'Receber cobrança'}</h2></div><button type="button" aria-label="Fechar" disabled={busy} onClick={() => setSelected(null)}><X/></button></header>
      <p className="pm-help">{selected.new ? 'O cálculo usa o valor recebido dividido pelas aulas do plano, com a regra atual do profissional. O valor fica registrado e não muda ao editar a regra depois.' : 'Confirme somente depois de verificar a movimentação. Este registro não realiza uma transferência bancária.'}</p>
      <form onSubmit={e => { e.preventDefault(); void run(selected.new ? { action: 'accrue', appointmentId, paymentId, confirmed } : { action: commissions ? 'pay' : 'receive', id: String(selected.id), method }); }}>
        {selected.new ? <>
          <label>Aula<select required value={appointmentId} onChange={e => { setAppointmentId(e.target.value); setPaymentId(''); }}><option value="">Selecione uma aula</option>{appointments.map(a => <option key={a.id} value={a.id}>{a.date || a.data} · {a.studentName || a.pacienteNome} · {a.professor || a.profissionalNome}</option>)}</select></label>
          <label>Cobrança recebida<select required value={paymentId} onChange={e => setPaymentId(e.target.value)}><option value="">Selecione a cobrança</option>{payments.map(p => <option key={p.id} value={p.id}>{p.plano} · {money(p.valor)} · {p.dataPagamento}</option>)}</select></label>
          <label className="pm-checkbox"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo que esta aula foi realizada.</label>
        </> : <><p className="pm-billing-total">{money(amount(selected))}</p>{!commissions && <label>Forma de pagamento<select value={method} onChange={e => setMethod(e.target.value)}><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option></select></label>}</>}
        {message && <p role="alert" className="pm-feedback">{message}</p>}
        <footer><button type="button" className="pm-button-secondary" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button><button className="pm-button-primary" disabled={busy}>{busy ? 'Salvando…' : 'Confirmar e salvar'}</button></footer>
      </form>
    </section></div>}
  </div>;
}

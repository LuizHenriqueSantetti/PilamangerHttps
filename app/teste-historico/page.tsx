'use client';
import { useEffect, useState } from 'react';

export default function DemoHistoryPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const response = await fetch('/api/demo-history', { cache: 'no-store' });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || 'Não foi possível verificar a importação.');
    setData(result);
  };
  useEffect(() => { void load().catch(error => setError(error.message)); }, []);
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/demo-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'authorized-demo-history-2026-10-22', privacyAccepted: accepted }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível importar.');
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao importar.'); }
    finally { setBusy(false); }
  };
  return <main style={{ maxWidth: 1100, margin: '40px auto', padding: 24, fontFamily: 'sans-serif', lineHeight: 1.6 }}>
    <h1>Carga única de demonstração</h1>
    <p>Exceção autorizada em 22/10/2026. Não libera datas passadas no cadastro normal. Somente estes oito clientes e dados inteiramente fictícios; sem cobranças ou transferências reais.</p>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p>Verificando autorização…</p>}
    {data?.used ? <section><h2>Importação concluída e bloqueada para novos usos</h2><p>8 clientes, 5 pagamentos anteriores, 3 cobranças pendentes, 8 agendamentos e 5 comissões de demonstração.</p><p>Recebimentos simulados: R$ {Number(data.summary.received).toFixed(2).replace('.', ',')}</p><p>O cadastro normal continua aceitando somente datas atuais e futuras.</p></section> : data && <>
      <p>Datas simuladas de cadastro e movimentação; o registro de auditoria mantém a data real da importação. Planos de setembro constam encerrados por validade; os históricos continuam consultáveis.</p>
      <div style={{ overflowX: 'auto' }}><table><thead><tr>{['Cliente', 'Nascimento', 'Cadastro', 'Plano', 'Vencimento', 'Pagamento', 'Agendamento'].map(label => <th key={label} style={{ padding: 8, textAlign: 'left' }}>{label}</th>)}</tr></thead><tbody>{data.scenarios.map((s: any) => <tr key={s.nome}>{[s.nome, s.birth, s.joined, s.plan, s.due, s.paid || 'Pendente', s.date].map((value, i) => <td key={i} style={{ padding: 8 }}>{value}</td>)}</tr>)}</tbody></table></div>
      {data.expired ? <p>Prazo encerrado. A importação não está mais disponível.</p> : <><label style={{ display: 'block', margin: '24px 0' }}><input type="checkbox" checked={accepted} disabled={busy} onChange={e => setAccepted(e.target.checked)}/> Autorizo o aceite de privacidade somente nestes oito cadastros de teste. Isso não comprova consentimento real das pessoas.</label><button disabled={!accepted || busy} onClick={() => void submit()}>{busy ? 'Importando…' : 'Importar os oito clientes uma única vez'}</button></>}
    </>}
    <p><a href="/">Voltar ao PilaManager e carregar os dados atualizados</a></p>
  </main>;
}

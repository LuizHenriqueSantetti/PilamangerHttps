import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Edit2, Eye, Grid2X2, List, Mail, Phone, Plus, Power, Search, Trash2, Users, X } from 'lucide-react';
import { ModulePermission } from '../utils/permissions';
import { Professional } from '../types/professional';
import { professionalService } from '../services/professionalService';
import { onlyDigits } from '../utils/masks';
import { performAction, confirmAction } from '../utils/notifications';
import { ProfessionalFormModal } from './ProfessionalFormModal';
import { ProfessionalScheduleModal } from './ProfessionalScheduleModal';

export function ProfessoresView({ isDark, perms, canViewSchedule = false }: { isDark: boolean; perms?: ModulePermission; canViewSchedule?: boolean }) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [view, setView] = useState<'lista' | 'grade'>('lista');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [profile, setProfile] = useState<Professional | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Professional | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [scheduleProfessional, setScheduleProfessional] = useState<Professional | null>(null);

  const P = isDark ? '#67C8CE' : '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const muted = isDark ? '#111F35' : '#EEF6FA';
  const inputBg = isDark ? '#203650' : '#F7FAFC';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';

  const load = () => setProfessionals(professionalService.list({ includeInactive: true }));
  useEffect(() => {
    load();
    const updated = () => load();
    const openRecord = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.module !== 'equipe') return;
      const found = professionalService.get(String(detail.recordId));
      if (found && !found.deletedAt) setProfile(found);
    };
    window.addEventListener('pilamanager:professionals-updated', updated);
    window.addEventListener('pilamanager:open-record', openRecord);
    return () => { window.removeEventListener('pilamanager:professionals-updated', updated); window.removeEventListener('pilamanager:open-record', openRecord); };
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    const digits = onlyDigits(query);
    return professionals.filter(item => {
      const matchesQuery = !text || [item.nome, item.email, item.registroProfissional, item.telefone, item.cpf].some(value => value.toLocaleLowerCase().includes(text)) || (digits && [item.telefone, item.cpf].some(value => onlyDigits(value).includes(digits)));
      return matchesQuery && (type === 'todos' || item.tipo === type) && (status === 'todos' || item.status === status);
    });
  }, [professionals, query, type, status]);
  useEffect(() => setPage(1), [query, type, status]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const stats = { total: professionals.length, ativos: professionals.filter(item => item.status === 'ativo').length, professores: professionals.filter(item => item.tipo === 'professor').length, fisios: professionals.filter(item => item.tipo === 'fisioterapeuta').length };

  const openNew = () => { setEditing(null); setShowForm(true); };
  const saved = (record: Professional) => { setShowForm(false); setEditing(null); setProfile(record); load(); };
  const remove = async () => { if (!deleteTarget) return; if (await performAction('professional', () => professionalService.softDelete(deleteTarget.id), 'Profissional desativado e removido da lista.')) { setDeleteTarget(null); load(); } };
  const toggleProfessional = async (item: Professional) => {
    if (item.status === 'ativo' && !await confirmAction('Desativar este profissional?')) return;
    if (await performAction('professional', () => professionalService.setStatus(item.id, item.status === 'ativo' ? 'inativo' : 'ativo'), item.status === 'ativo' ? 'Profissional desativado.' : 'Profissional ativado.')) load();
  };

  return <div className="p-5" style={{ backgroundColor: bg }}>
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-2xl font-bold" style={{ color: textMain }}>Profissionais</h1><p className="mt-1 text-sm" style={{ color: textSub }}>Gerencie professores, fisioterapeutas, pagamentos e disponibilidade.</p></div>{perms?.criar !== false && <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: P }}><Plus className="h-4 w-4" />Adicionar novo profissional</button>}</div>

    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{[['Total', stats.total, P], ['Ativos', stats.ativos, '#35A978'], ['Professores', stats.professores, '#E5A83B'], ['Fisioterapeutas', stats.fisios, P]].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border px-4 py-3" style={{ backgroundColor: card, borderColor: border }}><p className="text-xs font-semibold uppercase" style={{ color: textSub }}>{label}</p><p className="mt-1 text-2xl font-bold" style={{ color: String(color) }}>{value}</p></div>)}</div>

    <div className="mb-4 rounded-xl border p-3" style={{ backgroundColor: card, borderColor: border }}><div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_190px_170px_auto_auto]">
      <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: textSub }} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, CPF, e-mail ou telefone" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }} /></label>
      <select value={type} onChange={e => setType(e.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}><option value="todos">Todos os tipos</option><option value="professor">Professores</option><option value="fisioterapeuta">Fisioterapeutas</option></select>
      <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border px-3 py-2.5 text-sm" style={{ backgroundColor: inputBg, borderColor: border, color: textMain }}><option value="todos">Todas situacoes</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select>
      <button onClick={() => { setQuery(''); setType('todos'); setStatus('todos'); }} className="rounded-xl border px-3 py-2.5 text-sm font-semibold" style={{ borderColor: border, color: textSub }}>Limpar filtros</button>
      <div className="team-view-toggle flex rounded-xl border p-1" style={{ borderColor: border, backgroundColor: inputBg }}><button type="button" onClick={() => setView('lista')} className="rounded-lg p-2" style={{ backgroundColor: view === 'lista' ? P : 'transparent', color: view === 'lista' ? '#fff' : textSub }} aria-label="Visualização em lista" aria-pressed={view === 'lista'}><List className="h-4 w-4" /></button><button type="button" onClick={() => setView('grade')} className="rounded-lg p-2" style={{ backgroundColor: view === 'grade' ? P : 'transparent', color: view === 'grade' ? '#fff' : textSub }} aria-label="Visualização em grade" aria-pressed={view === 'grade'}><Grid2X2 className="h-4 w-4" /></button></div>
    </div></div>

    {visible.length === 0 ? <div className="rounded-xl border py-14 text-center" style={{ backgroundColor: card, borderColor: border }}><Users className="mx-auto mb-3 h-10 w-10 opacity-40" style={{ color: textSub }} /><p className="font-semibold" style={{ color: textMain }}>Nenhum profissional encontrado</p><p className="text-sm" style={{ color: textSub }}>Ajuste os filtros ou cadastre um novo profissional.</p></div> : <div className={`team-results ${view === 'grade' ? 'team-results-grid grid grid-cols-1 gap-3 xl:grid-cols-2' : 'team-results-list space-y-2.5'}`}>{visible.map(item => <article key={item.id} className="team-professional-card rounded-xl border p-4" style={{ backgroundColor: card, borderColor: border }}><div className={`flex flex-col gap-4 ${view === 'lista' ? 'xl:flex-row xl:items-center' : ''}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">{item.foto ? <img src={item.foto} alt={item.nome} className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl font-bold text-white" style={{ backgroundColor: P }}>{initials(item.nome)}</div>}<div className="min-w-0"><h2 className="truncate font-bold" style={{ color: textMain }}>{item.nome}</h2><p className="text-xs" style={{ color: textSub }}>{item.tipo === 'professor' ? 'Professor' : 'Fisioterapeuta'} · {item.registroProfissional || 'Registro nao informado'}</p></div></div>
      <div className="min-w-[180px]"><p className="flex items-center gap-1 truncate text-xs" style={{ color: textSub }}><Mail className="h-3 w-3" />{item.email}</p><p className="mt-1 flex items-center gap-1 text-xs" style={{ color: textSub }}><Phone className="h-3 w-3" />{item.telefone}</p></div>
      <div className="min-w-[130px]"><span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ color: item.status === 'ativo' ? '#35A978' : '#D95C5C', backgroundColor: item.status === 'ativo' ? 'rgba(53,169,120,.13)' : 'rgba(217,92,92,.13)' }}>{item.status === 'ativo' ? 'Ativo' : 'Inativo'}</span><p className="mt-2 text-xs" style={{ color: professionalService.hasBankDetails(item) ? '#35A978' : '#E5A83B' }}>{professionalService.hasBankDetails(item) ? 'Dados bancarios informados' : 'Dados bancarios incompletos'}</p></div>
      <div className="flex flex-wrap items-center gap-1">{canViewSchedule && <button type="button" onClick={() => setScheduleProfessional(item)} className="pm-team-schedule-button" aria-label={`Ver agenda de ${item.nome}`}><CalendarDays size={16} aria-hidden="true"/>Ver agenda</button>}<Icon label="Visualizar" onClick={() => setProfile(item)} color={P}><Eye className="h-4 w-4" /></Icon>{perms?.editar !== false && <Icon label="Editar" onClick={() => { setEditing(item); setShowForm(true); }} color={textSub}><Edit2 className="h-4 w-4" /></Icon>}{perms?.editar !== false && <Icon label={item.status === 'ativo' ? 'Inativar' : 'Ativar'} onClick={() => void toggleProfessional(item)} color="#E5A83B"><Power className="h-4 w-4" /></Icon>}{perms?.excluir !== false && <Icon label="Excluir" onClick={() => setDeleteTarget(item)} color="#D95C5C"><Trash2 className="h-4 w-4" /></Icon>}</div>
    </div></article>)}</div>}

    <div className="mt-4 flex items-center justify-between rounded-xl border px-3 py-3" style={{ backgroundColor: card, borderColor: border }}><p className="text-sm" style={{ color: textSub }}>Exibindo {visible.length} de {filtered.length}</p><div className="flex items-center gap-2"><button disabled={currentPage === 1} onClick={() => setPage(value => value - 1)} className="rounded-lg px-3 py-2 text-sm disabled:opacity-40" style={{ backgroundColor: muted, color: textMain }}>Anterior</button><span className="text-sm font-semibold" style={{ color: textMain }}>{currentPage}/{totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setPage(value => value + 1)} className="rounded-lg px-3 py-2 text-sm disabled:opacity-40" style={{ backgroundColor: muted, color: textMain }}>Proxima</button></div></div>

    {showForm && <ProfessionalFormModal isDark={isDark} professional={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={saved} />}
    {canViewSchedule && scheduleProfessional && <ProfessionalScheduleModal professional={scheduleProfessional} onClose={() => setScheduleProfessional(null)}/>}
    {profile && <ProfileModal professional={profile} isDark={isDark} onClose={() => setProfile(null)} onEdit={() => { setEditing(profile); setProfile(null); setShowForm(true); }} canEdit={perms?.editar !== false} />}
    {deleteTarget && <ConfirmModal isDark={isDark} name={deleteTarget.nome} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />}
  </div>;
}

function Icon({ label, onClick, color, children }: { label: string; onClick: () => void; color: string; children: React.ReactNode }) { return <button title={label} aria-label={label} onClick={onClick} className="rounded-lg p-2" style={{ color, backgroundColor: `${color}14` }}>{children}</button>; }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'PR'; }

function ProfileModal({ professional, isDark, onClose, onEdit, canEdit }: { professional: Professional; isDark: boolean; onClose: () => void; onEdit: () => void; canEdit: boolean }) {
  const P = isDark ? '#67C8CE' : '#087F8C'; const card = isDark ? '#182B43' : '#FFFFFF'; const border = isDark ? '#31455F' : '#E4EDF3'; const muted = isDark ? '#111F35' : '#EEF6FA'; const textMain = isDark ? '#EDF4FC' : '#142C50'; const textSub = isDark ? '#AFBFD3' : '#687E98';
  const address = [professional.endereco.logradouro, professional.endereco.numero, professional.endereco.bairro, professional.endereco.cidade, professional.endereco.uf].filter(Boolean).join(', ');
  return <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,.62)' }}><div className="pm-panel max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 shadow-2xl" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true"><div className="pm-panel-header mb-5 flex items-start justify-between"><div className="flex items-center gap-3">{professional.foto ? <img src={professional.foto} alt={professional.nome} className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl font-bold text-white" style={{ backgroundColor: P }}>{initials(professional.nome)}</div>}<div><h2 className="text-lg font-bold" style={{ color: textMain }}>{professional.nome}</h2><p className="text-sm" style={{ color: textSub }}>{professional.tipo === 'professor' ? 'Professor' : 'Fisioterapeuta'} · {professional.registroProfissional}</p></div></div><button onClick={onClose} aria-label="Fechar" className="p-2" style={{ color: textSub }}><X className="h-5 w-5" /></button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[
    ['Status', professional.status === 'ativo' ? 'Ativo' : 'Inativo'], ['Especialidade', professional.especialidade || '-'], ['E-mail', professional.email], ['Telefone', professional.telefone], ['CPF', maskSensitive(professional.cpf)], ['RG', maskSensitive(professional.rg)], ['Data de admissao', professional.dataAdmissao || '-'], ['Contrato', professional.tipoContrato], ['Endereco', address || '-'], ['Comissao', professional.tipoComissao === 'percentual' ? `${professional.comissaoPercentual}%` : professional.tipoComissao === 'fixa' ? `R$ ${professional.valorFixoAula.toFixed(2)} por aula` : `${professional.comissaoPercentual}% + R$ ${professional.valorFixoAula.toFixed(2)}`], ['Dados bancarios', professionalService.hasBankDetails(professional) ? 'Informados' : 'Incompletos'], ['Observacoes', professional.observacoes || '-']
  ].map(([label, value]) => <div key={label} className="rounded-xl p-3" style={{ backgroundColor: muted }}><p className="text-xs font-semibold uppercase" style={{ color: textSub }}>{label}</p><p className="mt-1 break-words text-sm" style={{ color: textMain }}>{value}</p></div>)}</div>{canEdit && <div className="mt-5 flex justify-end"><button onClick={onEdit} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: P }}><Edit2 className="h-4 w-4" />Editar profissional</button></div>}</div></div>;
}

function ConfirmModal({ isDark, name, onCancel, onConfirm }: { isDark: boolean; name: string; onCancel: () => void; onConfirm: () => void }) { const card = isDark ? '#182B43' : '#FFFFFF'; const border = isDark ? '#31455F' : '#DCE6EC'; const textMain = isDark ? '#EDF4FC' : '#1A3047'; const textSub = isDark ? '#AFBFD3' : '#62758A'; return <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,.62)' }}><div className="pm-panel w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true"><AlertTriangle className="mb-3 h-9 w-9 text-[#D95C5C]" /><h2 className="text-lg font-bold" style={{ color: textMain }}>Excluir profissional</h2><p className="mt-2 text-sm" style={{ color: textSub }}>{name} sera inativado e removido da lista. O historico de aulas, pagamentos e relatorios sera preservado.</p><div className="mt-5 flex justify-end gap-2"><button onClick={onCancel} className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: border, color: textSub }}>Cancelar</button><button onClick={onConfirm} className="rounded-xl bg-[#D95C5C] px-4 py-2 text-sm font-semibold text-white">Excluir</button></div></div></div>; }
function maskSensitive(value: string) { const digits = onlyDigits(value); return digits.length > 4 ? `${digits.slice(0, 3)}.${'*'.repeat(Math.max(3, digits.length - 5))}-${digits.slice(-2)}` : value || '-'; }

import { maskCurrency, parseCurrency } from '../utils/masks';
import { notify, performActionWithResult, confirmAction, NotificationType } from '../utils/notifications';
import { ModulePermission } from '../utils/permissions';
import { patientEnrollmentService, PlanAssignment } from '../services/patientEnrollmentService';
import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Power, Copy, Users,
  ChevronDown, X, Check, AlertTriangle, CreditCard,
  TrendingUp, UserCheck, DollarSign, Star, Clock, Zap
} from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  quantidadeAulas: number;
  duracao: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  beneficios: string[];
  ativo: boolean;
  destacado: boolean;
  limiteAlunos: number | null;
  alunosInscritos: number;
  cor: string;
  createdAt: string;
}

interface PlanosViewProps {
  isDark: boolean;
  perms?: ModulePermission;
  canViewPatients?: boolean;
  onOpenPatient?: (patientId: string) => void;
}

const DURACAO_LABEL: Record<string, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual'
};

const DURACAO_MESES: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12
};

const PLAN_COLOR = '#087F8C';

interface ModalPlanoProps {
  isDark: boolean;
  plano: Plano | null;
  onSave: (data: Omit<Plano, 'id' | 'alunosInscritos' | 'createdAt'>) => void;
  onClose: () => void;
}

function ModalPlano({ isDark, plano, onSave, onClose }: ModalPlanoProps) {
  const [nome, setNome] = useState(plano?.nome ?? '');
  const [descricao, setDescricao] = useState(plano?.descricao ?? '');
  const [preco, setPreco] = useState(maskCurrency(String(Math.round((plano?.preco ?? 0) * 100))));
  const [quantidadeAulas, setQuantidadeAulas] = useState(plano?.quantidadeAulas?.toString() ?? '');
  const [duracao, setDuracao] = useState<Plano['duracao']>(plano?.duracao ?? 'mensal');
  const [beneficios, setBeneficios] = useState<string[]>(plano?.beneficios ?? ['']);
  const [ativo, setAtivo] = useState(plano?.ativo ?? true);
  const [destacado, setDestacado] = useState(plano?.destacado ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addBeneficio = () => setBeneficios(prev => [...prev, '']);
  const removeBeneficio = (i: number) => setBeneficios(prev => prev.filter((_, idx) => idx !== i));
  const updateBeneficio = (i: number, val: string) => setBeneficios(prev => prev.map((b, idx) => idx === i ? val : b));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome obrigatório';
    if (!Number.isFinite(parseCurrency(preco)) || parseCurrency(preco) <= 0) e.preco = 'Preço inválido';
    if (!quantidadeAulas || !Number.isInteger(Number(quantidadeAulas)) || Number(quantidadeAulas) <= 0) e.quantidadeAulas = 'Quantidade de aulas inválida';
    if (beneficios.some(b => !b.trim())) e.beneficios = 'Remova ou preencha todos os benefícios';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { notify('Verifique as informações do plano.', 'warning'); return; }
    onSave({
      nome: nome.trim(),
      descricao: descricao.trim(),
      preco: parseCurrency(preco),
      quantidadeAulas: Number(quantidadeAulas),
      duracao,
      beneficios: beneficios.filter(b => b.trim()),
      ativo,
      destacado,
      limiteAlunos: null,
      cor: PLAN_COLOR
    });
  };

  const P = '#087F8C';
  const bg = isDark ? '#182B43' : '#ffffff';
  const inputBg = isDark ? '#0B1426' : '#F4F8FB';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSecondary = isDark ? '#AFBFD3' : '#687E98';
  const textInput = isDark ? '#EDF4FC' : '#142C50';

  return (
    <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div role="dialog" aria-modal="true" aria-label={plano ? "Editar Plano" : "Novo Plano"} className="pm-panel pm-plan-dialog w-full rounded-2xl shadow-2xl flex flex-col" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
        {/* Header */}
        <div className="pm-panel-header flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: border }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight" style={{ color: textMain }}>
                {plano ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <p className="text-xs" style={{ color: textSecondary }}>Configure os detalhes do plano</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: textSecondary, backgroundColor: inputBg }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>Nome do Plano *</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: inputBg, borderColor: errors.nome ? '#D95C5C' : border, color: textInput }}
              placeholder="Ex: Plano Premium"
            />
            {errors.nome && <p className="text-xs mt-1" style={{ color: '#D95C5C' }}>{errors.nome}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none resize-none transition-colors"
              style={{ backgroundColor: inputBg, borderColor: border, color: textInput }}
              placeholder="Descreva o plano brevemente"
            />
          </div>

          {/* Preço + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>Preço (R$) *</label>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Preço do plano"
                value={preco}
                onChange={e => setPreco(maskCurrency(e.target.value))}
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
                style={{ backgroundColor: inputBg, borderColor: errors.preco ? '#D95C5C' : border, color: textInput }}
                placeholder="0,00"
              />
              {errors.preco && <p className="text-xs mt-1" style={{ color: '#D95C5C' }}>{errors.preco}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>Duração</label>
              <div className="relative">
                <select
                  value={duracao}
                  onChange={e => setDuracao(e.target.value as Plano['duracao'])}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none appearance-none pr-8 transition-colors"
                  style={{ backgroundColor: inputBg, borderColor: border, color: textInput }}
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 pointer-events-none" style={{ color: P }} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: textSecondary }}>Quantidade de Aulas *</label>
            <input
              type="number"
              value={quantidadeAulas}
              onChange={e => setQuantidadeAulas(e.target.value)}
              min="1"
              step="1"
              className="w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: inputBg, borderColor: errors.quantidadeAulas ? '#D95C5C' : border, color: textInput }}
              placeholder="Ex: 8"
            />
            {errors.quantidadeAulas && <p className="text-xs mt-1" style={{ color: '#D95C5C' }}>{errors.quantidadeAulas}</p>}
          </div>

          {/* Benefícios */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textSecondary }}>Benefícios</label>
              <button type="button" onClick={addBeneficio} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors" style={{ backgroundColor: `${P}15`, color: P }}>
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {beneficios.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={b}
                    onChange={e => updateBeneficio(i, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors"
                    style={{ backgroundColor: inputBg, borderColor: border, color: textInput }}
                    placeholder={`Benefício ${i + 1}`}
                  />
                  {beneficios.length > 1 && (
                    <button type="button" onClick={() => removeBeneficio(i)} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ backgroundColor: 'rgba(217,92,92,0.1)', color: '#D95C5C' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.beneficios && <p className="text-xs mt-1" style={{ color: '#D95C5C' }}>{errors.beneficios}</p>}
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setAtivo(!ativo)}
                className="w-10 h-5 rounded-full transition-colors relative cursor-pointer"
                style={{ backgroundColor: ativo ? P : border }}
              >
                <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm" style={{ left: ativo ? '22px' : '2px' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: textMain }}>Ativo</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setDestacado(!destacado)}
                className="w-10 h-5 rounded-full transition-colors relative cursor-pointer"
                style={{ backgroundColor: destacado ? '#E5A83B' : border }}
              >
                <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm" style={{ left: destacado ? '22px' : '2px' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: textMain }}>Destacado</span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: border }}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors" style={{ borderColor: border, color: textSecondary, backgroundColor: 'transparent' }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit as never}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: P }}
          >
            {plano ? 'Salvar Alterações' : 'Criar Plano'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModalAlunosProps {
  isDark: boolean;
  plano: Plano;
  alunos: Array<{ id: string; nome: string; foto?: string; status: string; assignment: PlanAssignment }>;
  onOpenPatient?: (patientId: string) => void;
  onClose: () => void;
}

function ModalAlunos({ isDark, plano, alunos, onClose, onOpenPatient }: ModalAlunosProps) {
  const [search, setSearch] = useState('');
  const P = '#087F8C';
  const bg = isDark ? '#182B43' : '#ffffff';
  const inputBg = isDark ? '#0B1426' : '#F4F8FB';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSecondary = isDark ? '#AFBFD3' : '#687E98';

  return (
    <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="pm-panel w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: bg, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
        <div className="pm-panel-header flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: border }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: textMain }}>Alunos Inscritos</h2>
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{plano.nome} · {plano.alunosInscritos} alunos</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: textSecondary, backgroundColor: inputBg }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 pb-3"><label className="relative block"><span className="sr-only">Pesquisar aluno</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:textSecondary }} /><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar aluno..." className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2" style={{ backgroundColor:inputBg, borderColor:border, color:textMain }} /></label></div>
        <div className="px-5 pb-5 space-y-2 max-h-96 overflow-y-auto" tabIndex={0} aria-label="Alunos vinculados ao plano">
          {alunos.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: textSecondary }}>Nenhum aluno vinculado a este plano.</p>
          ) : (
            alunos.filter(aluno => aluno.nome.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map((aluno) => (
              <button type="button" disabled={!onOpenPatient} onClick={() => onOpenPatient?.(aluno.id)} key={aluno.id} className="w-full flex items-center gap-3 p-3 rounded-xl text-left disabled:cursor-default" style={{ backgroundColor: inputBg }}>
                {aluno.foto ? <img src={aluno.foto} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" /> : <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: PLAN_COLOR }}>{aluno.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>}
                <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate" style={{ color:textMain }}>{aluno.nome}</p><p className="text-xs" style={{ color:textSecondary }}>{aluno.status === 'ativo' ? 'Ativo' : 'Indisponível'} · vínculo {aluno.assignment.status}</p><p className="text-xs" style={{ color:textSecondary }}>Início: {new Date(`${aluno.assignment.dataInicio}T12:00:00`).toLocaleDateString('pt-BR')} · Vencimento: {aluno.assignment.dataVencimento ? new Date(`${aluno.assignment.dataVencimento}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</p></div>
              </button>
            ))
          )}
          {alunos.length > 0 && alunos.every(aluno => !aluno.nome.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) && <p className="text-center text-sm py-6" style={{ color:textSecondary }}>Nenhum aluno encontrado.</p>}
        </div>
      </div>
    </div>
  );
}

export function PlanosView({ isDark, perms, canViewPatients = true, onOpenPatient }: PlanosViewProps) {
  const P = '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#ffffff';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSecondary = isDark ? '#AFBFD3' : '#687E98';
  const mutedBg = isDark ? '#111F35' : '#EEF6FA';

  const [planos, setPlanos] = useState<Plano[]>(() => { try { return JSON.parse(localStorage.getItem('planos') || '[]'); } catch { return []; } });
  const [patients, setPatients] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('pacientes') || '[]'); } catch { return []; } });
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [busca, setBusca] = useState('');
  const [modalEditar, setModalEditar] = useState<Plano | null | 'novo'>(null);
  const [modalAlunos, setModalAlunos] = useState<Plano | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<Plano | null>(null);

  useEffect(() => {
    const refresh = () => { try { setPatients(JSON.parse(localStorage.getItem('pacientes') || '[]')); } catch { setPatients([]); } };
    window.addEventListener('pilamanager:data-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('pilamanager:data-changed', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const plansWithEnrollment = useMemo(() => planos.map(plan => ({ ...plan, alunosInscritos: patientEnrollmentService.membersForPlan(plan.id).length })), [planos, patients]);

  const showToast = (msg: string, type: NotificationType = 'success') => notify(msg, type);

  const planosFiltrados = useMemo(() => {
    return plansWithEnrollment.filter(p => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.descricao.toLowerCase().includes(busca.toLowerCase());
      const matchFiltro = filtro === 'todos' || (filtro === 'ativos' && p.ativo) || (filtro === 'inativos' && !p.ativo);
      return matchBusca && matchFiltro;
    });
  }, [plansWithEnrollment, filtro, busca]);

  const stats = useMemo(() => ({
    total: plansWithEnrollment.length,
    ativos: plansWithEnrollment.filter(p => p.ativo).length,
    totalAlunos: plansWithEnrollment.reduce((acc, p) => acc + p.alunosInscritos, 0),
    receitaMensal: plansWithEnrollment
      .filter(p => p.ativo)
      .reduce((acc, p) => acc + (p.preco / DURACAO_MESES[p.duracao]) * p.alunosInscritos, 0)
  }), [plansWithEnrollment]);

  const [saving, setSaving] = useState(false);
  const persistPlans = async (next: Plano[], message: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await performActionWithResult('plans', () => { localStorage.setItem('planos', JSON.stringify(next)); return next; }, message);
      if (!saved.ok) return;
      setPlanos(saved.value);
      window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
      setModalEditar(null);
      setConfirmarExclusao(null);
    } finally { setSaving(false); }
  };
  const handleSave = (data: Omit<Plano, 'id' | 'alunosInscritos' | 'createdAt'>) => {
    if (saving || (modalEditar === 'novo' ? perms?.criar === false : perms?.editar === false)) return;
    if (planos.some(p => p.id !== (typeof modalEditar === 'object' ? modalEditar?.id : '') && p.nome.trim().toLocaleLowerCase() === data.nome.toLocaleLowerCase())) {
      showToast('Já existe um plano com este nome.', 'warning'); return;
    }
    const next = modalEditar === 'novo'
      ? [{ ...data, id: crypto.randomUUID(), alunosInscritos: 0, createdAt: new Date().toISOString().slice(0, 10) }, ...planos]
      : planos.map(p => p.id === (modalEditar as Plano)?.id ? { ...p, ...data } : p);
    void persistPlans(next, modalEditar === 'novo' ? 'Plano cadastrado.' : 'Plano atualizado.');
  };
  const handleToggleAtivo = async (id: string) => {
    if (perms?.editar === false) return;
    if (planos.find(p => p.id === id)?.ativo && !await confirmAction('Desativar este plano? Os vínculos e o histórico serão preservados.')) return;
    void persistPlans(planos.map(p => p.id === id ? { ...p, ativo: !p.ativo } : p), 'Situação do plano atualizada.');
  };
  const handleDuplicar = (plano: Plano) => {
    if (perms?.criar === false) return;
    void persistPlans([{ ...plano, id: crypto.randomUUID(), nome: plano.nome + ' (Cópia)', cor: PLAN_COLOR, limiteAlunos: null, ativo: false, alunosInscritos: 0, createdAt: new Date().toISOString().slice(0, 10) }, ...planos], 'Plano duplicado.');
  };
  const handleExcluir = (plano: Plano) => {
    if (perms?.excluir === false) return;
    const hasHistory = patientEnrollmentService.assignments().some(a => String(a.planoId) === String(plano.id));
    if (hasHistory) { showToast('Este plano possui histórico de vínculos. Desative-o para preservar os registros.', 'warning'); setConfirmarExclusao(null); return; }
    void persistPlans(planos.filter(p => p.id !== plano.id), 'Plano excluído.');
  };

  return (
    <div className="p-6 min-h-full pm-plans" style={{ backgroundColor: bg }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold leading-tight" style={{ color: textMain }}>Planos</h1>
          <p className="text-sm mt-0.5" style={{ color: textSecondary }}>
            Catálogo de serviços e vínculos ·{' '}
            <span className="font-semibold" style={{ color: P }}>{stats.ativos} ativos</span>
          </p>
        </div>
        <button
          onClick={() => setModalEditar('novo')}
          disabled={perms?.criar === false}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
          style={{ background: P }}
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {/* Stats compactos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total de Planos', value: stats.total, icon: CreditCard, color: P },
          { label: 'Planos Ativos', value: stats.ativos, icon: Zap, color: '#35A978' },
          { label: 'Alunos Inscritos', value: stats.totalAlunos, icon: UserCheck, color: '#076A76' },
          { label: 'Receita Mensal Est.', value: stats.receitaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUp, color: '#E5A83B' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${stat.color}15` }}>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-lg font-bold leading-none" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: textSecondary }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar planos..."
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ backgroundColor: card, borderColor: border, color: textMain }}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: border, backgroundColor: card }}>
          {(['todos', 'ativos', 'inativos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className="px-4 py-2.5 text-sm font-medium transition-colors capitalize whitespace-nowrap"
              style={{
                backgroundColor: filtro === f ? P : 'transparent',
                color: filtro === f ? '#fff' : textSecondary
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Planos */}
      {planosFiltrados.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ backgroundColor: card, border: `1px solid ${border}` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: mutedBg }}>
            <CreditCard className="w-7 h-7" style={{ color: P, opacity: 0.5 }} />
          </div>
          <p className="font-semibold text-base" style={{ color: textMain }}>Nenhum plano encontrado</p>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>Tente ajustar os filtros ou crie um novo plano</p>
          <button
            onClick={() => setModalEditar('novo')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: P }}
          >
            <Plus className="w-4 h-4" /> Novo Plano
          </button>
        </div>
      ) : (
        <div className="pm-plan-catalog">
          <div className="pm-plan-table-head"><span>Plano e benefícios</span><span>Investimento</span><span>Vínculos</span><span>Gerenciar</span></div>
          {planosFiltrados.map(plano => (
            <article key={plano.id} className="pm-plan-row">
              <div className="pm-plan-description">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3>{plano.nome}</h3>
                  <span className="pm-status" data-active={plano.ativo}>{plano.ativo ? 'Ativo' : 'Inativo'}</span>
                  {plano.destacado && <Star size={14} aria-label="Destaque" color="#c58a28" />}
                </div>
                <p>{plano.descricao}</p>
                <div className="pm-plan-benefits">{plano.beneficios.map((b, i) => <span key={i}>{b}</span>)}</div>
              </div>
              <div className="pm-plan-price"><strong>{plano.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><small>{DURACAO_LABEL[plano.duracao]} · {plano.quantidadeAulas} aulas</small></div>
              <button className="pm-plan-members" disabled={!canViewPatients} onClick={() => setModalAlunos(plano)}><Users size={16}/><strong>{plano.alunosInscritos}</strong><span>alunos vinculados</span></button>
              <div className="pm-plan-actions">
                {perms?.editar !== false && <button disabled={saving} onClick={() => setModalEditar(plano)}><Edit2 size={14}/>Editar</button>}
                {perms?.criar !== false && <button disabled={saving} onClick={() => handleDuplicar(plano)} title="Duplicar plano" aria-label={`Duplicar ${plano.nome}`}><Copy size={15}/></button>}
                {perms?.editar !== false && <button disabled={saving} onClick={() => handleToggleAtivo(plano.id)} title={plano.ativo ? 'Desativar' : 'Ativar'} aria-label={`${plano.ativo ? 'Desativar' : 'Ativar'} ${plano.nome}`}><Power size={15}/></button>}
                {perms?.excluir !== false && <button disabled={saving} className="pm-danger" onClick={() => setConfirmarExclusao(plano)} title="Excluir plano" aria-label={`Excluir ${plano.nome}`}><Trash2 size={15}/></button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {modalEditar !== null && (
        <ModalPlano
          isDark={isDark}
          plano={modalEditar === 'novo' ? null : modalEditar}
          onSave={handleSave}
          onClose={() => setModalEditar(null)}
        />
      )}

      {/* Modal Alunos */}
      {modalAlunos && (
        <ModalAlunos
          isDark={isDark}
          plano={modalAlunos}
          alunos={patientEnrollmentService.membersForPlan(modalAlunos.id).map(({ patient, assignment }) => ({ id:String(patient.id), nome:String(patient.nome), foto:patient.foto, status:String(patient.status || 'ativo'), assignment }))}
          onOpenPatient={onOpenPatient}
          onClose={() => setModalAlunos(null)}
        />
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmarExclusao && (
        <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="pm-panel w-full max-w-sm rounded-2xl shadow-2xl p-6" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(217,92,92,0.12)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#D95C5C' }} />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: textMain }}>Excluir Plano</h3>
                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: textSecondary }}>
              Tem certeza que deseja excluir o plano <strong style={{ color: textMain }}>"{confirmarExclusao.nome}"</strong>?
              {confirmarExclusao.alunosInscritos > 0 && (
                <span className="block mt-1.5 font-medium" style={{ color: '#D95C5C' }}>
                  Atenção: {confirmarExclusao.alunosInscritos} aluno(s) inscrito(s) neste plano.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarExclusao(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                style={{ borderColor: border, color: textSecondary }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmarExclusao)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#D95C5C' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { savePdfDocument } from '../utils/pdfDelivery';
import { ModulePermission } from '../utils/permissions';
import { useState, useEffect } from 'react';
import { Search, Plus, X, Edit2, Trash2, User, Calendar, CreditCard, AlertCircle, Target, Phone, Download, Copy, History, FileText } from 'lucide-react';
import { exportarPacientesPDF } from '../utils/pdfExport';
import { gerarDeclaracaoPresenca } from '../utils/declaracaoPresenca';
import { isValidCPF, isValidPhone, maskCPF, maskPhone, onlyDigits } from '../utils/masks';
import { validateEmail } from '../utils/validators';
import { patientHistoryService, PatientHistoryType } from '../services/patientHistoryService';
import { auditService } from '../services/auditService';
import { notify, notifyError, performAction, performActionWithResult } from '../utils/notifications';
import { SaveStatus } from '../services/saveStatusService';
import { flushRemoteStorage } from '../services/remoteStorageSync';
import { patientEnrollmentService } from '../services/patientEnrollmentService';
import { createPrivacyAcceptance, PRIVACY_CONSENT_TEXT } from '../utils/privacy';
import jsPDF from 'jspdf';
import { formatCalendarDate } from '../utils/calendarDate';

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  idade: number;
  dataNascimento?: string;
  dataCadastro: string;
  plano: string;
  planoId?: string;
  aulasRestantes?: number;
  planoValidoAte?: string;
  email: string;
  telefone: string;
  endereco?: string;
  observacoes: {
    deficiencias?: string;
    problemaSaude?: string;
    dores?: string;
    queixas?: string;
    objetivos?: string;
  };
  descricaoEspecial?: string;
  status: 'ativo' | 'indisponivel';
  historicoStatus?: Array<{ data: string; status: string; motivo?: string }>;
  privacyConsent?: ReturnType<typeof createPrivacyAcceptance>;
}

interface PacientesViewProps {
  perms?: ModulePermission;
  isDark: boolean;
}

export function PacientesView({ isDark, perms }: PacientesViewProps) {
  const textPrimary = isDark ? '#F4F8FB' : '#182B43';
  const textSecondary = isDark ? '#E2E8F0' : '#687E98';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [perfilTab, setPerfilTab] = useState<'dados' | 'plano' | 'agenda' | 'pagamentos' | 'avaliacoes'>('dados');
  const [historyFilter, setHistoryFilter] = useState<PatientHistoryType>('todos');
  const [showNewPaciente, setShowNewPaciente] = useState(false);
  const [planSearch, setPlanSearch] = useState('');
  const [patientPrivacyAccepted, setPatientPrivacyAccepted] = useState(false);
  const [editPatientPrivacyAccepted, setEditPatientPrivacyAccepted] = useState(false);
  const [showEditPaciente, setShowEditPaciente] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pacienteToDelete, setPacienteToDelete] = useState<Paciente | null>(null);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [statusChangeMotivo, setStatusChangeMotivo] = useState('');
  const [pacienteToChangeStatus, setPacienteToChangeStatus] = useState<Paciente | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [filterPlano, setFilterPlano] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDeclaracaoModal, setShowDeclaracaoModal] = useState(false);
  const [declaracaoData, setDeclaracaoData] = useState({
    data: new Date().toISOString().split('T')[0],
    horaInicio: '09:00',
    horaFim: '10:00',
    profissionalNome: '',
    profissionalRegistro: '',
    observacoes: ''
  });

  // Carregar somente os pacientes persistidos pelo sistema.
  const getPacientesIniciais = (): Paciente[] => {
    try { return JSON.parse(localStorage.getItem('pacientes') || '[]'); } catch { return []; }
  };

  const [pacientes, setPacientes] = useState<Paciente[]>(getPacientesIniciais());

  useEffect(() => {
    const openRecord = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.module !== 'pacientes') return;
      const found = pacientes.find(item => String(item.id) === String(detail.recordId));
      if (found) { setSelectedPaciente(found); setPerfilTab('dados'); }
    };
    window.addEventListener('pilamanager:open-record', openRecord);
    return () => window.removeEventListener('pilamanager:open-record', openRecord);
  }, [pacientes]);
  const [undoDelete, setUndoDelete] = useState<Paciente | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Salvar pacientes no localStorage sempre que mudarem
  useEffect(() => {
    let current = true;
    let timer: number | undefined;
    setSaveStatus('saving');
    localStorage.setItem('pacientes', JSON.stringify(pacientes));
    void flushRemoteStorage().then(() => {
      if (!current) return;
      setSaveStatus('saved');
      timer = window.setTimeout(() => setSaveStatus('idle'), 1600);
    }).catch(() => { if (current) setSaveStatus('error'); });
    return () => { current = false; window.clearTimeout(timer); };
  }, [pacientes]);

  const [newPaciente, setNewPaciente] = useState<Partial<Paciente>>({
    nome: '',
    cpf: '',
    idade: 0,
    dataNascimento: '',
    dataCadastro: new Date().toISOString().split('T')[0],
    plano: '',
    planoId: '',
    email: '',
    telefone: '',
    observacoes: {
      deficiencias: '',
      problemaSaude: '',
      dores: '',
      queixas: '',
      objetivos: ''
    },
    descricaoEspecial: '',
    status: 'ativo'
  });

  const activePlans = patientEnrollmentService.activePlans();
  const planos = [...new Set(activePlans.map(item => String(item.nome)))];

  const readList = (key: string): any[] => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const selectedAppointments = selectedPaciente
    ? readList('agendamentos').filter(item => String(item.studentId || item.pacienteId || '') === selectedPaciente.id || item.studentName === selectedPaciente.nome || item.pacienteNome === selectedPaciente.nome)
    : [];
  const selectedPayments = selectedPaciente
    ? readList('pagamentos').filter(item => String(item.pacienteId || '') === selectedPaciente.id || item.pacienteNome === selectedPaciente.nome || item.aluno === selectedPaciente.nome)
    : [];
  const selectedPlanAssignment = selectedPaciente
    ? readList('planosAtribuidos').find(item => String(item.pacienteId || '') === selectedPaciente.id || item.pacienteNome === selectedPaciente.nome)
    : null;

  const filteredPacientes = pacientes.filter(paciente => {
    const searchDigits = onlyDigits(searchTerm);
    const matchesSearch = paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         paciente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         Boolean(searchDigits && (onlyDigits(paciente.cpf).includes(searchDigits) || onlyDigits(paciente.telefone).includes(searchDigits)));
    const matchesPlano = !filterPlano || paciente.plano === filterPlano;
    const matchesStatus = !filterStatus || paciente.status === filterStatus;
    return matchesSearch && matchesPlano && matchesStatus;
  });

  const handleCreatePaciente = async () => {
    if (!newPaciente.nome || !newPaciente.email || !newPaciente.cpf || !newPaciente.telefone || !newPaciente.dataNascimento) {
      alert('Preencha nome, CPF, data de nascimento, e-mail e telefone.');
      return;
    }
    if (!isValidCPF(newPaciente.cpf)) { alert('Informe um CPF valido.'); return; }
    const emailError = validateEmail(newPaciente.email); if (emailError) { alert(emailError); return; }
    if (!isValidPhone(newPaciente.telefone)) { alert('Informe um telefone valido com DDD.'); return; }
    if (new Date(`${newPaciente.dataNascimento}T12:00:00`) >= new Date()) { alert('Informe uma data de nascimento valida.'); return; }
    if (pacientes.some(item => onlyDigits(item.cpf) === onlyDigits(newPaciente.cpf))) { alert('Ja existe um paciente com este CPF.'); return; }
    if (pacientes.some(item => item.email.toLowerCase() === newPaciente.email!.toLowerCase())) { alert('Ja existe um paciente com este e-mail.'); return; }
    if (!patientPrivacyAccepted) { alert('Aceite a Política de Privacidade antes de salvar o cadastro do paciente.'); return; }

    const paciente: Paciente = {
      id: crypto.randomUUID(),
      nome: newPaciente.nome!,
      cpf: newPaciente.cpf!,
      idade: newPaciente.idade!,
      dataNascimento: newPaciente.dataNascimento,
      dataCadastro: newPaciente.dataCadastro!,
      plano: '',
      planoId: newPaciente.planoId || '',
      email: newPaciente.email!,
      telefone: newPaciente.telefone!,
      observacoes: newPaciente.observacoes!,
      descricaoEspecial: newPaciente.descricaoEspecial,
      status: 'ativo',
      privacyConsent: createPrivacyAcceptance('paciente')
    };

    try {
      const saved = await performActionWithResult('patient-create', () => patientEnrollmentService.createPatient(paciente, newPaciente.planoId, perms).patient as Paciente, 'Paciente cadastrado com sucesso.');
      if (!saved.ok) return;
      const result = { patient: saved.value };
      setPacientes([...pacientes, result.patient]);
      auditService.record({ action: 'Criou paciente', actionType: 'create', module: 'Pacientes', recordId: paciente.id, after: result.patient });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível cadastrar o paciente.');
      return;
    }
    setShowNewPaciente(false);
    setNewPaciente({
      nome: '',
      cpf: '',
      idade: 0,
      dataNascimento: '',
      dataCadastro: new Date().toISOString().split('T')[0],
      plano: '',
      planoId: '',
      email: '',
      telefone: '',
      observacoes: {
        deficiencias: '',
        problemaSaude: '',
        dores: '',
        queixas: '',
        objetivos: ''
      },
      descricaoEspecial: '',
      status: 'ativo'
    });
    setPatientPrivacyAccepted(false);
  };

  const handleDeletePaciente = (paciente: Paciente) => {
    setPacienteToDelete(paciente);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (pacienteToDelete) {
      const next = pacientes.filter(a => a.id !== pacienteToDelete.id);
      if (!await performAction('patient', () => localStorage.setItem('pacientes', JSON.stringify(next)), 'Paciente excluído.')) return;
      setPacientes(next);
      setUndoDelete(pacienteToDelete);
      auditService.record({ action: 'Excluiu paciente', actionType: 'delete', module: 'Pacientes', recordId: pacienteToDelete.id, before: pacienteToDelete });
      window.setTimeout(() => setUndoDelete(null), 7000);
      window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
      setSelectedPaciente(null);
      setShowDeleteConfirm(false);
      setPacienteToDelete(null);
    }
  };

  const handleToggleStatus = (paciente: Paciente) => {
    setPacienteToChangeStatus(paciente);
    setShowStatusChange(true);
  };

  const confirmStatusChange = async () => {
    if (pacienteToChangeStatus) {
      const newStatus: Paciente['status'] = pacienteToChangeStatus.status === 'ativo' ? 'indisponivel' : 'ativo';
      const historicoAtualizado = [
        ...(pacienteToChangeStatus.historicoStatus || []),
        {
          data: new Date().toISOString().split('T')[0],
          status: newStatus,
          motivo: statusChangeMotivo || 'Sem motivo especificado'
        }
      ];

      const next = pacientes.map(a => a.id === pacienteToChangeStatus.id ? { ...a, status: newStatus, historicoStatus: historicoAtualizado } : a);
      if (!await performAction('patient', () => localStorage.setItem('pacientes', JSON.stringify(next)), 'Situação do paciente atualizada.')) return;
      setPacientes(next);
      auditService.record({ action: 'Alterou status do paciente', actionType: 'update', module: 'Pacientes', recordId: pacienteToChangeStatus.id, before: pacienteToChangeStatus, after: { ...pacienteToChangeStatus, status: newStatus, historicoStatus: historicoAtualizado } });
      window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));

      if (selectedPaciente?.id === pacienteToChangeStatus.id) {
        setSelectedPaciente({ ...pacienteToChangeStatus, status: newStatus, historicoStatus: historicoAtualizado });
      }

      setShowStatusChange(false);
      setStatusChangeMotivo('');
      setPacienteToChangeStatus(null);
    }
  };

  const handleEditPaciente = (paciente: Paciente) => {
    setEditingPaciente({ ...paciente });
    setEditPatientPrivacyAccepted(Boolean(paciente.privacyConsent?.accepted));
    setShowEditPaciente(true);
  };

  const saveEditPaciente = async () => {
    if (editingPaciente) {
      if (!isValidCPF(editingPaciente.cpf)) { alert('Informe um CPF valido.'); return; }
      const emailError = validateEmail(editingPaciente.email); if (emailError) { alert(emailError); return; }
      if (!isValidPhone(editingPaciente.telefone)) { alert('Informe um telefone valido com DDD.'); return; }
      if (!editingPaciente.dataNascimento || new Date(`${editingPaciente.dataNascimento}T12:00:00`) >= new Date()) { alert('Informe uma data de nascimento valida.'); return; }
      if (pacientes.some(item => item.id !== editingPaciente.id && onlyDigits(item.cpf) === onlyDigits(editingPaciente.cpf))) { alert('Ja existe um paciente com este CPF.'); return; }
      if (pacientes.some(item => item.id !== editingPaciente.id && item.email.toLowerCase() === editingPaciente.email.toLowerCase())) { alert('Ja existe um paciente com este e-mail.'); return; }
      if (!editingPaciente.privacyConsent?.accepted && !editPatientPrivacyAccepted) { alert('Aceite a Política de Privacidade antes de salvar os dados do paciente.'); return; }
      let persisted!: Paciente;
      try {
        const patientToPersist = {
          ...editingPaciente,
          privacyConsent: editingPaciente.privacyConsent?.accepted ? editingPaciente.privacyConsent : createPrivacyAcceptance('paciente'),
        };
        const saved = await performActionWithResult('patient-edit:' + editingPaciente.id, () => patientEnrollmentService.updatePatient(patientToPersist, editingPaciente.planoId, perms).patient as Paciente, 'Dados do paciente atualizados.');
        if (!saved.ok) return;
        persisted = saved.value;
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Não foi possível atualizar o paciente.');
        return;
      }
      setPacientes(pacientes.map(a => a.id === persisted.id ? persisted : a));
      auditService.record({ action: 'Editou paciente', actionType: 'update', module: 'Pacientes', recordId: persisted.id, before: pacientes.find(a => a.id === persisted.id), after: persisted });
      if (selectedPaciente?.id === persisted.id) setSelectedPaciente(persisted);
      setShowEditPaciente(false);
      setEditingPaciente(null);
      setEditPatientPrivacyAccepted(false);
    }
  };

  const handleCopyInfo = (paciente: Paciente) => {
    const info = `
Nome: ${paciente.nome}
Idade: ${paciente.idade} anos
CPF: ${paciente.cpf}
Email: ${paciente.email}
Telefone: ${paciente.telefone}
Plano: ${paciente.plano}
Data de Cadastro: ${formatCalendarDate(paciente.dataCadastro)}
Status: ${paciente.status}

=== OBSERVAÇÕES MÉDICAS ===
Deficiências: ${paciente.observacoes.deficiencias || 'Nenhuma'}
Problemas de Saúde: ${paciente.observacoes.problemaSaude || 'Nenhum'}
Dores: ${paciente.observacoes.dores || 'Nenhuma'}
Queixas: ${paciente.observacoes.queixas || 'Nenhuma'}
Objetivos: ${paciente.observacoes.objetivos || 'Não especificado'}

${paciente.descricaoEspecial ? `Notas Especiais: ${paciente.descricaoEspecial}` : ''}
    `.trim();

    void navigator.clipboard.writeText(info).then(() => notify('Informações copiadas.', 'success')).catch(error => notifyError(error, 'Não foi possível copiar as informações.'));
  };

  const handleExportPDF = (paciente: Paciente) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 16;
    let y = 0;

    const azul: [number, number, number] = [91, 141, 239];
    const verde: [number, number, number] = [76, 175, 136];
    const cinza: [number, number, number] = [107, 114, 128];
    const cinzaClaro: [number, number, number] = [229, 231, 235];
    const preto: [number, number, number] = [31, 41, 55];
    const branco: [number, number, number] = [255, 255, 255];

    // Cabeçalho
    doc.setFillColor(...azul);
    doc.rect(0, 0, W, 26, 'F');
    doc.setTextColor(...branco);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('PilaManager Studio', margin, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Ficha do Paciente', margin, 18);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, W - margin, 18, { align: 'right' });
    y = 34;

    // Avatar inicial + nome
    doc.setFillColor(...azul);
    doc.circle(margin + 7, y + 7, 7, 'F');
    doc.setTextColor(...branco);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(paciente.nome.charAt(0).toUpperCase(), margin + 7, y + 10, { align: 'center' });

    doc.setTextColor(...preto);
    doc.setFontSize(13);
    doc.text(paciente.nome, margin + 18, y + 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...cinza);
    const statusLabel = paciente.status === 'ativo' ? 'Ativo' : 'Indisponível';
    doc.text(`${statusLabel}  ·  ${paciente.plano}  ·  Cadastro: ${formatCalendarDate(paciente.dataCadastro)}`, margin + 18, y + 13);
    y += 24;

    // Função auxiliar: seção título
    const secao = (titulo: string, cor: [number, number, number]) => {
      doc.setFillColor(...cor);
      doc.rect(margin, y, W - margin * 2, 6, 'F');
      doc.setTextColor(...branco);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo.toUpperCase(), margin + 3, y + 4.2);
      y += 9;
    };

    // Função auxiliar: linha de campo
    const campo = (label: string, valor: string) => {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...cinza);
      doc.text(label, margin + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...preto);
      doc.text(valor || '—', margin + 38, y);
      y += 6;
    };

    // Dados Pessoais
    secao('Dados Pessoais', azul);
    campo('Nome completo', paciente.nome);
    campo('CPF', paciente.cpf);
    campo('Data de nascimento', paciente.dataNascimento ? new Date(`${paciente.dataNascimento}T12:00:00`).toLocaleDateString('pt-BR') : '—');
    campo('Idade', `${paciente.idade} anos`);
    campo('Email', paciente.email);
    campo('Telefone', paciente.telefone);
    campo('Plano', paciente.plano);
    campo('Status', statusLabel);
    y += 3;

    // Informações Médicas
    secao('Informações Médicas', verde);
    campo('Deficiências', paciente.observacoes?.deficiencias || 'Nenhuma');
    campo('Problemas de saúde', paciente.observacoes?.problemaSaude || 'Nenhum');
    campo('Dores / Limitações', paciente.observacoes?.dores || 'Nenhuma');
    campo('Queixas / Obs.', paciente.observacoes?.queixas || 'Nenhuma');
    campo('Objetivos', paciente.observacoes?.objetivos || 'Não especificado');
    y += 3;

    if (paciente.descricaoEspecial) {
      secao('Notas Especiais', [74, 123, 224]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...preto);
      const linhas = doc.splitTextToSize(paciente.descricaoEspecial, W - margin * 2 - 6);
      doc.text(linhas, margin + 3, y);
      y += linhas.length * 5 + 3;
    }

    // Rodapé
    doc.setDrawColor(...cinzaClaro);
    doc.line(margin, 280, W - margin, 280);
    doc.setFontSize(7);
    doc.setTextColor(...cinza);
    doc.setFont('helvetica', 'normal');
    doc.text('PilaManager Studio — Documento Confidencial', W / 2, 285, { align: 'center' });

    savePdfDocument(doc, `ficha_${paciente.nome.replace(/\s+/g, '_')}.pdf`);
  };

  const handleGerarDeclaracao = () => {
    if (!selectedPaciente) return;

    if (!declaracaoData.profissionalNome) {
      alert('Por favor, informe o nome do profissional responsável');
      return;
    }

    gerarDeclaracaoPresenca({
      pacienteNome: selectedPaciente.nome,
      pacienteCPF: selectedPaciente.cpf,
      data: declaracaoData.data,
      horaInicio: declaracaoData.horaInicio,
      horaFim: declaracaoData.horaFim,
      profissionalNome: declaracaoData.profissionalNome,
      profissionalRegistro: declaracaoData.profissionalRegistro,
      observacoes: declaracaoData.observacoes
    });

    setShowDeclaracaoModal(false);
    setDeclaracaoData({
      data: new Date().toISOString().split('T')[0],
      horaInicio: '09:00',
      horaFim: '10:00',
      profissionalNome: '',
      profissionalRegistro: '',
      observacoes: ''
    });
  };

  const P = '#087F8C';
  const cardBg = isDark ? '#182B43' : '#FFFFFF';
  const pagBorder = isDark ? '#31455F' : '#DCE6EC';
  const mutedBg = isDark ? '#111F35' : '#EEF6FA';
  const inputBgP = isDark ? '#203650' : '#F7FAFC';

  return (
    <div className="p-6" style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9' }}>
      {undoDelete && (
        <div className="fixed right-5 bottom-5 z-[9999] rounded-xl shadow-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: isDark ? '#182B43' : '#FFFFFF', border: `1px solid ${isDark ? '#31455F' : '#DCE6EC'}` }}>
          <span className="text-sm" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>Paciente excluido.</span>
          <button
            onClick={async () => {
              const restored = [undoDelete, ...pacientes];
              if (!await performAction('patient', () => localStorage.setItem('pacientes', JSON.stringify(restored)), 'Paciente restaurado.')) return;
              setPacientes(restored);
              auditService.record({ action: 'Restaurou paciente', actionType: 'restore', module: 'Pacientes', recordId: undoDelete.id, after: undoDelete });
              setUndoDelete(null);
              window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
            }}
            className="text-sm font-semibold"
            style={{ color: '#087F8C' }}
          >
            Desfazer
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>Pacientes</h2>
          <p className="text-sm mt-0.5" style={{ color: textSecondary }}>
            {pacientes.filter(p => p.status === 'ativo').length} ativos · {pacientes.length} total
          </p>
        </div>
        {saveStatus !== 'idle' && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: saveStatus === 'error' ? 'rgba(217,92,92,0.12)' : saveStatus === 'saving' ? 'rgba(229,168,59,0.14)' : 'rgba(53,169,120,0.12)', color: saveStatus === 'error' ? '#D95C5C' : saveStatus === 'saving' ? '#E5A83B' : '#35A978' }}>
            {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Salvo' : 'Erro ao salvar'}
          </span>
        )}
        <div className="flex items-center gap-2">
          {(perms?.exportar !== false) && (
            <button
              onClick={() => exportarPacientesPDF(filteredPacientes)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
              style={{ borderColor: pagBorder, color: P, backgroundColor: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? '#203650' : '#EDF5F7'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Download className="w-4 h-4" />PDF
            </button>
          )}
          {(perms?.criar !== false) && (
            <button
              onClick={() => setShowNewPaciente(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: P }}
            >
              <Plus className="w-4 h-4" />Novo Paciente
            </button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: P, opacity: 0.6 }} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none text-sm"
            style={{ backgroundColor: inputBgP, borderColor: pagBorder, color: isDark ? '#EDF4FC' : '#1A3047' }}
          />
        </div>
        <select
          value={filterPlano}
          onChange={(e) => setFilterPlano(e.target.value)}
          className="px-3 py-2.5 rounded-xl border focus:outline-none text-sm"
          style={{ backgroundColor: inputBgP, borderColor: pagBorder, color: isDark ? '#EDF4FC' : '#1A3047', minWidth: '130px' }}
        >
          <option value="">Todos os planos</option>
          {planos.map(plano => <option key={plano} value={plano}>{plano}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border focus:outline-none text-sm"
          style={{ backgroundColor: inputBgP, borderColor: pagBorder, color: isDark ? '#EDF4FC' : '#1A3047', minWidth: '130px' }}
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="indisponivel">Indisponíveis</option>
        </select>
        <span className="flex items-center px-2 text-sm" style={{ color: textSecondary }}>
          {filteredPacientes.length} resultado{filteredPacientes.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredPacientes.map(paciente => (
          <article
            key={paciente.id}
            className="rounded-2xl border p-4"
            style={{ backgroundColor: cardBg, borderColor: pagBorder }}
            onClick={() => { setSelectedPaciente(paciente); setPerfilTab('dados'); }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: P, fontSize: '0.85rem' }}>
                {paciente.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm leading-tight" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{paciente.nome}</p>
                <p className="mt-1 break-words text-xs leading-relaxed" style={{ color: textSecondary }}>{paciente.email}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0" style={{
                backgroundColor: paciente.status === 'ativo' ? 'rgba(53,169,120,0.12)' : 'rgba(229,168,59,0.12)',
                color: paciente.status === 'ativo' ? '#35A978' : '#E5A83B'
              }}>
                {paciente.status === 'ativo' ? 'Ativo' : 'Indisponível'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl px-3 py-2" style={{ backgroundColor: mutedBg }}>
                <p className="font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Idade</p>
                <p className="mt-1" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{paciente.idade} anos</p>
              </div>
              <div className="rounded-xl px-3 py-2" style={{ backgroundColor: mutedBg }}>
                <p className="font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Cadastro</p>
                <p className="mt-1" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{formatCalendarDate(paciente.dataCadastro)}</p>
              </div>
              <div className="col-span-2 rounded-xl px-3 py-2" style={{ backgroundColor: mutedBg }}>
                <p className="font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Plano</p>
                <p className="mt-1 font-semibold" style={{ color: P }}>{paciente.plano}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              {(perms?.editar !== false) && (
                <button onClick={() => handleEditPaciente(paciente)} className="rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: pagBorder, color: P }}>
                  Editar
                </button>
              )}
              {(perms?.excluir !== false) && (
                <button onClick={() => handleDeletePaciente(paciente)} className="rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'rgba(217,92,92,0.35)', color: '#D95C5C' }}>
                  Excluir
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Pacientes Table */}
      <div className="hidden rounded-2xl overflow-hidden border md:block" style={{ backgroundColor: cardBg, borderColor: pagBorder }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${pagBorder}`, backgroundColor: mutedBg }}>
                <th className="text-left py-3 px-5 text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Paciente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Idade</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Plano</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Cadastro</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textSecondary }}>Status</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide text-right" style={{ color: textSecondary }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPacientes.map((paciente, idx) => (
                <tr
                  key={paciente.id}
                  className="cursor-pointer transition-colors group"
                  style={{ borderTop: `1px solid ${pagBorder}`, backgroundColor: idx % 2 !== 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.012)') : 'transparent' }}
                  onClick={() => { setSelectedPaciente(paciente); setPerfilTab('dados'); }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = mutedBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 !== 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.012)') : 'transparent')}
                >
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: P, fontSize: '0.8rem' }}>
                        {paciente.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{paciente.nome}</p>
                        <p className="text-xs" style={{ color: textSecondary }}>{paciente.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-sm" style={{ color: textSecondary }}>{paciente.idade} anos</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(3,140,140,0.12)', color: P }}>
                      {paciente.plano}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-sm" style={{ color: textSecondary }}>{formatCalendarDate(paciente.dataCadastro)}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{
                      backgroundColor: paciente.status === 'ativo' ? 'rgba(53,169,120,0.12)' : 'rgba(229,168,59,0.12)',
                      color: paciente.status === 'ativo' ? '#35A978' : '#E5A83B'
                    }}>
                      {paciente.status === 'ativo' ? 'Ativo' : 'Indisponível'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                      {(perms?.editar !== false) && (
                        <button
                          onClick={() => handleEditPaciente(paciente)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: textSecondary }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${P}18`; e.currentTarget.style.color = P; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSecondary; }}
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(perms?.excluir !== false) && (
                        <button
                          onClick={() => handleDeletePaciente(paciente)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: textSecondary }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(217,92,92,0.1)'; e.currentTarget.style.color = '#D95C5C'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSecondary; }}
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paciente Details Modal */}
      {selectedPaciente && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="pm-panel w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: isDark ? '#182B43' : '#ffffff' }} role="dialog" aria-modal="true">
            {/* Header */}
            <div className="pm-panel-header px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${isDark ? '#31455F' : '#DCE6EC'}` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#087F8C' }}>
                  <span className="text-white font-bold">{selectedPaciente.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="font-bold" style={{ color: '#087F8C' }}>{selectedPaciente.nome}</h2>
                  <p className="text-xs" style={{ color: textSecondary }}>{selectedPaciente.email} · {selectedPaciente.telefone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPaciente(null)} className="p-1.5 rounded-lg" style={{ color: textSecondary }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 gap-0.5 flex-shrink-0 overflow-hidden" style={{ borderBottom: `1px solid ${isDark ? '#31455F' : '#DCE6EC'}`, backgroundColor: isDark ? '#111F35' : '#F3F7F9' }}>
              {(['dados', 'plano', 'agenda', 'pagamentos', 'avaliacoes'] as const).map(tab => {
                const labels: Record<string, string> = { dados: 'Dados', plano: 'Plano', agenda: 'Agenda', pagamentos: 'Pagamentos', avaliacoes: 'Avaliações' };
                const active = perfilTab === tab;
                return (
                  <button key={tab} onClick={() => setPerfilTab(tab)} className="px-3 py-3 text-sm transition-all border-b-2 whitespace-nowrap" style={{ color: active ? '#087F8C' : textSecondary, borderColor: active ? '#087F8C' : 'transparent', fontWeight: active ? 600 : 400, backgroundColor: 'transparent', marginBottom: '-1px' }}>
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {perfilTab === 'dados' && (() => {
                const pInfoBg = isDark ? '#111F35' : '#F3F7F9';
                const fields = [
                  { label: 'Nome completo', value: selectedPaciente.nome, full: true },
                  { label: 'CPF', value: selectedPaciente.cpf || '—' },
                  { label: 'E-mail', value: selectedPaciente.email },
                  { label: 'Telefone', value: selectedPaciente.telefone },
                  { label: 'Data de Nascimento', value: selectedPaciente.dataNascimento ? new Date(selectedPaciente.dataNascimento + 'T00:00').toLocaleDateString('pt-BR') : '—' },
                  { label: 'Idade', value: `${selectedPaciente.idade} anos` },
                  { label: 'Data de Cadastro', value: formatCalendarDate(selectedPaciente.dataCadastro) },
                  { label: 'Endereço', value: selectedPaciente.endereco || '—', full: true },
                  { label: 'Status', value: selectedPaciente.status === 'ativo' ? 'Ativo' : 'Indisponível', status: selectedPaciente.status },
                ];
                return (
                  <div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {fields.map(({ label, value, full, status: st }) => (
                        <div key={label} className={`p-3 rounded-xl border ${full ? 'col-span-2' : ''}`} style={{ backgroundColor: pInfoBg, borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: textSecondary }}>{label}</p>
                          {st ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: st === 'ativo' ? 'rgba(53,169,120,0.12)' : 'rgba(229,168,59,0.12)', color: st === 'ativo' ? '#35A978' : '#E5A83B' }}>
                              {value}
                            </span>
                          ) : (
                            <p className="font-medium text-sm" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{value}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {(selectedPaciente.observacoes?.objetivos || selectedPaciente.observacoes?.problemaSaude) && (
                      <div className="space-y-2">
                        {selectedPaciente.observacoes?.objetivos && (
                          <div className="p-3 rounded-xl border" style={{ backgroundColor: pInfoBg, borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: textSecondary }}>Objetivos</p>
                            <p className="text-sm" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{selectedPaciente.observacoes.objetivos}</p>
                          </div>
                        )}
                        {selectedPaciente.observacoes?.problemaSaude && (
                          <div className="p-3 rounded-xl border" style={{ backgroundColor: pInfoBg, borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: textSecondary }}>Observações de Saúde</p>
                            <p className="text-sm" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{selectedPaciente.observacoes.problemaSaude}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              {perfilTab === 'plano' && (
                <div className="space-y-3">
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9', borderBottom: `1px solid ${isDark ? '#31455F' : '#DCE6EC'}` }}>
                      <p className="font-semibold text-sm" style={{ color: '#087F8C' }}>Plano</p>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: selectedPaciente.plano ? 'rgba(53,169,120,0.12)' : 'rgba(96,123,121,0.12)', color: selectedPaciente.plano ? '#35A978' : textSecondary }}>
                        {selectedPlanAssignment?.status || (selectedPaciente.plano ? 'Ativo' : 'Não vinculado')}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ backgroundColor: isDark ? '#182B43' : '#FFFFFF' }}>
                      {[
                        { label: 'Plano', value: selectedPaciente.plano || '—' },
                        { label: 'Início', value: selectedPlanAssignment?.dataInicio ? new Date(`${selectedPlanAssignment.dataInicio}T12:00:00`).toLocaleDateString('pt-BR') : '—' },
                        { label: 'Validade', value: selectedPlanAssignment?.dataVencimento ? new Date(`${selectedPlanAssignment.dataVencimento}T12:00:00`).toLocaleDateString('pt-BR') : '—' },
                        { label: 'Situação', value: selectedPlanAssignment?.status || (selectedPaciente.plano ? 'Ativo' : 'Sem plano') },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-xs font-medium mb-0.5" style={{ color: textSecondary }}>{label}</p>
                          <p className="font-semibold text-sm" style={{ color: '#087F8C' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-center py-1" style={{ color: textSecondary }}>Histórico completo de planos disponível no módulo Planos.</p>
                </div>
              )}
              {perfilTab === 'agenda' && (
                <div className="space-y-2">
                  {selectedAppointments.length === 0 && <p className="text-sm text-center py-5" style={{ color: textSecondary }}>Nenhum agendamento vinculado a este paciente.</p>}
                  {selectedAppointments.map((ag, i) => (
                    <div key={ag.id || i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9', borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(3,140,140,0.1)' }}>
                        <span className="font-bold" style={{ color: '#087F8C', fontSize: '0.8rem', lineHeight: 1 }}>{ag.startTime || ag.horario || '—'}</span>
                        <span style={{ color: textSecondary, fontSize: '0.6rem' }}>{ag.data ? new Date(`${ag.data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][Number(ag.day)] || '—'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{ag.professor || ag.profissionalNome || 'Profissional não informado'}</p>
                        <p className="text-xs" style={{ color: textSecondary }}>{ag.room || ag.sala || 'Sala não informada'}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: ag.status === 'confirmado' ? 'rgba(53,169,120,0.12)' : ag.status === 'cancelado' ? 'rgba(217,92,92,0.12)' : 'rgba(229,168,59,0.12)', color: ag.status === 'confirmado' ? '#35A978' : ag.status === 'cancelado' ? '#D95C5C' : '#E5A83B' }}>
                        {ag.status === 'confirmado' ? 'Confirmado' : ag.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {perfilTab === 'pagamentos' && (
                <div className="space-y-2">
                  {selectedPayments.length === 0 && <p className="text-sm text-center py-5" style={{ color: textSecondary }}>Nenhum pagamento vinculado a este paciente.</p>}
                  {selectedPayments.map((p, i) => {
                    const rawDate = p.dataPagamento || p.vencimento || p.data || p.createdAt;
                    const formattedDate = rawDate ? new Date(String(rawDate).includes('T') ? rawDate : `${rawDate}T12:00:00`).toLocaleDateString('pt-BR') : '—';
                    const amount = Number(p.valor || p.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    return (
                      <div key={p.id || i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9', borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{p.descricao || p.categoria || 'Pagamento'}</p>
                          <p className="text-xs" style={{ color: textSecondary }}>{formattedDate}</p>
                        </div>
                        <p className="font-bold text-sm" style={{ color: '#087F8C' }}>{amount}</p>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: p.status === 'pago' ? 'rgba(53,169,120,0.12)' : p.status === 'atrasado' ? 'rgba(217,92,92,0.12)' : 'rgba(229,168,59,0.12)', color: p.status === 'pago' ? '#35A978' : p.status === 'atrasado' ? '#D95C5C' : '#E5A83B' }}>
                          {p.status === 'pago' ? 'Pago' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {perfilTab === 'avaliacoes' && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold mb-3" style={{ color: '#087F8C' }}>Avaliações</p>
                  {selectedPaciente.observacoes?.queixas && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9' }}>
                      <p className="text-xs mb-1" style={{ color: textSecondary }}>Queixas</p>
                      <p className="text-sm" style={{ color: '#087F8C' }}>{selectedPaciente.observacoes.queixas}</p>
                    </div>
                  )}
                  {selectedPaciente.observacoes?.dores && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9' }}>
                      <p className="text-xs mb-1" style={{ color: textSecondary }}>Dores</p>
                      <p className="text-sm" style={{ color: '#087F8C' }}>{selectedPaciente.observacoes.dores}</p>
                    </div>
                  )}
                  {selectedPaciente.descricaoEspecial && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9' }}>
                      <p className="text-xs mb-1" style={{ color: textSecondary }}>Observações Especiais</p>
                      <p className="text-sm" style={{ color: '#087F8C' }}>{selectedPaciente.descricaoEspecial}</p>
                    </div>
                  )}
                  {!selectedPaciente.observacoes?.queixas && !selectedPaciente.observacoes?.dores && !selectedPaciente.descricaoEspecial && (
                    <p className="text-sm text-center py-6" style={{ color: textSecondary }}>Nenhuma avaliação registrada.</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons — fora do scroll */}
            <div className="px-6 pb-2 flex-shrink-0">
              {(() => {
                const history = patientHistoryService.getPatientHistory(selectedPaciente);
                const filtered = historyFilter === 'todos' ? history : history.filter(item => item.type === historyFilter);
                const filters: PatientHistoryType[] = ['todos', 'planos', 'pagamentos', 'faltas', 'avaliacoes', 'agendamentos', 'alteracoes'];
                return (
                  <div className="pt-4 border-t" style={{ borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" style={{ color: '#087F8C' }} />
                        <p className="text-sm font-semibold" style={{ color: '#087F8C' }}>Historico do paciente</p>
                      </div>
                      <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value as PatientHistoryType)} className="px-3 py-1.5 rounded-lg border text-xs focus:outline-none" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9', borderColor: isDark ? '#31455F' : '#DCE6EC', color: isDark ? '#EDF4FC' : '#1A3047' }}>
                        {filters.map(filter => <option key={filter} value={filter}>{filter}</option>)}
                      </select>
                    </div>
                    {filtered.length === 0 ? (
                      <p className="text-sm text-center py-4" style={{ color: textSecondary }}>Nenhum historico encontrado para o filtro selecionado.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {filtered.slice(0, 8).map(item => (
                          <div key={item.id} className="p-3 rounded-xl border" style={{ backgroundColor: isDark ? '#111F35' : '#F3F7F9', borderColor: isDark ? '#31455F' : '#DCE6EC' }}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#EDF4FC' : '#1A3047' }}>{item.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{item.description}</p>
                              </div>
                              <span className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(3,140,140,0.12)', color: '#087F8C' }}>{item.type}</span>
                            </div>
                            <p className="text-[11px] mt-2" style={{ color: textSecondary }}>{item.responsible} - {new Date(item.date).toLocaleString('pt-BR')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 pb-5 pt-3 flex-shrink-0 space-y-3" style={{ borderTop: `1px solid ${isDark ? '#31455F' : '#DCE6EC'}` }}>
              <div className="flex gap-2">
                <button onClick={() => handleExportPDF(selectedPaciente)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: '#087F8C' }}>
                  <Download className="w-3.5 h-3.5" />Exportar PDF
                </button>
                <button onClick={() => handleEditPaciente(selectedPaciente)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border" style={{ borderColor: '#087F8C', color: '#087F8C', backgroundColor: 'transparent' }}>
                  Editar
                </button>
                <button onClick={() => handleToggleStatus(selectedPaciente)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border" style={{ borderColor: '#E5A83B', color: '#E5A83B', backgroundColor: 'transparent' }}>
                  {selectedPaciente.status === 'ativo' ? 'Indisponível' : 'Ativar'}
                </button>
                <button onClick={() => handleDeletePaciente(selectedPaciente)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium ml-auto" style={{ backgroundColor: 'rgba(217,92,92,0.12)', color: '#D95C5C' }}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && pacienteToDelete && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <div className="pm-panel w-full max-w-md rounded-2xl p-8 shadow-2xl" style={{
            backgroundColor: isDark ? '#182B43' : '#ffffff'
          }} role="dialog" aria-modal="true">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                backgroundColor: '#EF4444'
              }}>
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#087F8C' }}>
                Confirmar Exclusão
              </h2>
              <p style={{ color: '#087F8C', opacity: 0.8 }}>
                Tem certeza que deseja excluir o paciente <strong>{pacienteToDelete.nome}</strong>?
              </p>
              <p className="text-sm mt-2" style={{ color: textSecondary }}>
                Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPacienteToDelete(null);
                }}
                className="flex-1 px-6 py-3 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                  color: '#087F8C'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 rounded-lg transition-all duration-200 text-white"
                style={{
                  backgroundColor: '#EF4444'
                }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusChange && pacienteToChangeStatus && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <div className="pm-panel w-full max-w-md rounded-2xl p-8 shadow-2xl" style={{
            backgroundColor: isDark ? '#182B43' : '#ffffff'
          }} role="dialog" aria-modal="true">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#087F8C' }}>
                {pacienteToChangeStatus.status === 'ativo' ? 'Marcar como Indisponível' : 'Ativar'} Paciente
              </h2>
              <p style={{ color: '#087F8C', opacity: 0.8 }}>
                Você está prestes a {pacienteToChangeStatus.status === 'ativo' ? 'marcar como indisponível' : 'ativar'} o paciente <strong>{pacienteToChangeStatus.nome}</strong>.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                Motivo (opcional)
              </label>
              <textarea
                value={statusChangeMotivo}
                onChange={(e) => setStatusChangeMotivo(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                  borderColor: '#DCE6EC',
                  color: '#087F8C'
                }}
                placeholder="Ex: Férias, mudança de cidade, problema financeiro..."
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowStatusChange(false);
                  setStatusChangeMotivo('');
                  setPacienteToChangeStatus(null);
                }}
                className="flex-1 px-6 py-3 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                  color: '#087F8C'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmStatusChange}
                className="flex-1 px-6 py-3 rounded-lg transition-all duration-200 text-white"
                style={{
                  background: '#087F8C'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Paciente Modal */}
      {showEditPaciente && editingPaciente && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <div className="pm-panel w-full max-w-3xl rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto" style={{
            backgroundColor: isDark ? '#182B43' : '#ffffff'
          }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#087F8C' }}>
                Editar Paciente
              </h2>
              <button
                onClick={() => {
                  setShowEditPaciente(false);
                  setEditingPaciente(null);
                }}
                className="p-2 rounded-full transition-colors"
                style={{ color: '#087F8C' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={editingPaciente.nome}
                    onChange={(e) => setEditingPaciente({ ...editingPaciente, nome: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Idade
                  </label>
                  <input
                    type="number"
                    value={editingPaciente.idade}
                    onChange={(e) => setEditingPaciente({ ...editingPaciente, idade: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>CPF *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editingPaciente.cpf || ''}
                    onChange={(e) => setEditingPaciente({ ...editingPaciente, cpf: maskCPF(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: '#087F8C' }}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingPaciente.email}
                    onChange={(e) => setEditingPaciente({ ...editingPaciente, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={editingPaciente.telefone}
                    onChange={(e) => setEditingPaciente({ ...editingPaciente, telefone: maskPhone(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: '#087F8C' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={editingPaciente.dataNascimento || ''}
                    onChange={(e) => setEditingPaciente({ ...editingPaciente, dataNascimento: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: '#087F8C' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={editingPaciente.endereco || ''}
                    onChange={(e) => setEditingPaciente({ ...editingPaciente, endereco: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: '#087F8C' }}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Plano
                </label>
                <select
                  value={editingPaciente.planoId || ''}
                  onChange={(e) => { const plan = activePlans.find(item => String(item.id) === e.target.value); setEditingPaciente({ ...editingPaciente, planoId: e.target.value, plano: plan?.nome || '' }); }}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                >
                  <option value="">Sem plano</option>
                  {activePlans.map(plano => (
                    <option key={plano.id} value={plano.id}>{plano.nome} — R$ {Number(plano.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — {plano.quantidadeAulas} aulas</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Notas Especiais (ex: preferências de horário, observações importantes)
                </label>
                <textarea
                  value={editingPaciente.descricaoEspecial || ''}
                  onChange={(e) => setEditingPaciente({ ...editingPaciente, descricaoEspecial: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Ex: Prefere não conversar durante sessão, disponível apenas manhãs, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Deficiências
                </label>
                <textarea
                  value={editingPaciente.observacoes.deficiencias}
                  onChange={(e) => setEditingPaciente({
                    ...editingPaciente,
                    observacoes: { ...editingPaciente.observacoes, deficiencias: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Problemas de Saúde
                </label>
                <textarea
                  value={editingPaciente.observacoes.problemaSaude}
                  onChange={(e) => setEditingPaciente({
                    ...editingPaciente,
                    observacoes: { ...editingPaciente.observacoes, problemaSaude: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Dores e Limitações
                </label>
                <textarea
                  value={editingPaciente.observacoes.dores}
                  onChange={(e) => setEditingPaciente({
                    ...editingPaciente,
                    observacoes: { ...editingPaciente.observacoes, dores: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Queixas e Observações
                </label>
                <textarea
                  value={editingPaciente.observacoes.queixas}
                  onChange={(e) => setEditingPaciente({
                    ...editingPaciente,
                    observacoes: { ...editingPaciente.observacoes, queixas: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Objetivos
                </label>
                <textarea
                  value={editingPaciente.observacoes.objetivos}
                  onChange={(e) => setEditingPaciente({
                    ...editingPaciente,
                    observacoes: { ...editingPaciente.observacoes, objetivos: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowEditPaciente(false);
                    setEditingPaciente(null);
                    setEditPatientPrivacyAccepted(false);
                  }}
                  className="flex-1 px-6 py-3 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    color: '#087F8C'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEditPaciente}
                  className="flex-1 py-3 px-4 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  style={{
                    background: '#087F8C'
                  }}
                >
                  Salvar Alterações
                </button>
              </div>

              {!editingPaciente.privacyConsent?.accepted && (
                <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: textSecondary }}>
                  <input type="checkbox" checked={editPatientPrivacyAccepted} onChange={e => setEditPatientPrivacyAccepted(e.target.checked)} className="mt-1 h-4 w-4 flex-shrink-0" style={{ accentColor: '#087F8C' }} />
                  <span>{PRIVACY_CONSENT_TEXT}</span>
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Paciente Modal */}
      {showNewPaciente && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <div className="pm-panel w-full max-w-3xl rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto" style={{
            backgroundColor: isDark ? '#182B43' : '#ffffff'
          }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#087F8C' }}>
                Novo Paciente
              </h2>
              <button
                onClick={() => setShowNewPaciente(false)}
                className="p-2 rounded-full transition-colors"
                style={{ color: '#087F8C' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={newPaciente.nome}
                    onChange={(e) => setNewPaciente({ ...newPaciente, nome: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                    placeholder="Nome do paciente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Idade *
                  </label>
                  <input
                    type="number"
                    value={newPaciente.idade}
                    onChange={(e) => setNewPaciente({ ...newPaciente, idade: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                    placeholder="Idade"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>CPF *</label>
                  <input type="text" inputMode="numeric" value={newPaciente.cpf || ''} onChange={(e) => setNewPaciente({ ...newPaciente, cpf: maskCPF(e.target.value) })} className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2" style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: '#087F8C' }} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>Data de Nascimento *</label>
                  <input type="date" value={newPaciente.dataNascimento || ''} onChange={(e) => { const birth = new Date(`${e.target.value}T12:00:00`); const today = new Date(); let age = today.getFullYear() - birth.getFullYear(); if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--; setNewPaciente({ ...newPaciente, dataNascimento: e.target.value, idade: Math.max(0, age) }); }} className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2" style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: '#087F8C' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newPaciente.email}
                    onChange={(e) => setNewPaciente({ ...newPaciente, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={newPaciente.telefone}
                    onChange={(e) => setNewPaciente({ ...newPaciente, telefone: maskPhone(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Plano
                </label>
                <div className="mb-2">
                  <label className="sr-only" htmlFor="plan-search">Pesquisar plano</label>
                  <input id="plan-search" type="search" value={planSearch} onChange={e => setPlanSearch(e.target.value)} placeholder="Pesquisar plano..." className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2" style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: '#087F8C' }} />
                </div>
                <select
                  value={newPaciente.planoId || ''}
                  onChange={(e) => setNewPaciente({ ...newPaciente, planoId: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                >
                  <option value="">Cadastrar sem plano</option>
                  {activePlans.filter(plano => plano.nome.toLocaleLowerCase().includes(planSearch.trim().toLocaleLowerCase())).map(plano => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome} — R$ {Number(plano.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — {Number(plano.quantidadeAulas || 0)} aulas — {plano.duracao}
                    </option>
                  ))}
                </select>
                {activePlans.length === 0 && <p className="text-xs mt-2" style={{ color: '#D95C5C' }}>Nenhum plano disponível. O paciente será cadastrado sem plano.</p>}
                {activePlans.length > 0 && planSearch && activePlans.every(plano => !plano.nome.toLocaleLowerCase().includes(planSearch.trim().toLocaleLowerCase())) && <p className="text-xs mt-2" style={{ color: textSecondary }}>Nenhum plano encontrado para esta pesquisa.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Notas Especiais (ex: preferências de horário, observações importantes)
                </label>
                <textarea
                  value={newPaciente.descricaoEspecial}
                  onChange={(e) => setNewPaciente({ ...newPaciente, descricaoEspecial: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Ex: Prefere não conversar durante sessão, disponível apenas manhãs, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Deficiências
                </label>
                <textarea
                  value={newPaciente.observacoes?.deficiencias}
                  onChange={(e) => setNewPaciente({
                    ...newPaciente,
                    observacoes: { ...newPaciente.observacoes, deficiencias: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Descreva se há alguma deficiência..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Problemas de Saúde
                </label>
                <textarea
                  value={newPaciente.observacoes?.problemaSaude}
                  onChange={(e) => setNewPaciente({
                    ...newPaciente,
                    observacoes: { ...newPaciente.observacoes, problemaSaude: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Descreva problemas de saúde relevantes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Dores e Limitações
                </label>
                <textarea
                  value={newPaciente.observacoes?.dores}
                  onChange={(e) => setNewPaciente({
                    ...newPaciente,
                    observacoes: { ...newPaciente.observacoes, dores: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Descreva dores ou limitações físicas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Queixas e Observações
                </label>
                <textarea
                  value={newPaciente.observacoes?.queixas}
                  onChange={(e) => setNewPaciente({
                    ...newPaciente,
                    observacoes: { ...newPaciente.observacoes, queixas: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Outras queixas ou observações importantes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Objetivos
                </label>
                <textarea
                  value={newPaciente.observacoes?.objetivos}
                  onChange={(e) => setNewPaciente({
                    ...newPaciente,
                    observacoes: { ...newPaciente.observacoes, objetivos: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="O que o paciente busca alcançar..."
                />
              </div>

              <label className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: isDark ? '#0B1426' : '#F3F7F9', borderColor: '#DCE6EC', color: textSecondary }}>
                <input type="checkbox" checked={patientPrivacyAccepted} onChange={e => setPatientPrivacyAccepted(e.target.checked)} className="mt-1 h-4 w-4 flex-shrink-0" style={{ accentColor: '#087F8C' }} />
                <span>{PRIVACY_CONSENT_TEXT}</span>
              </label>

              <button
                onClick={handleCreatePaciente}
                className="w-full py-3 px-4 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{
                  background: '#087F8C'
                }}
              >
                Cadastrar Paciente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Declaração de Presença Modal */}
      {showDeclaracaoModal && selectedPaciente && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <div className="pm-panel w-full max-w-2xl rounded-2xl p-8 shadow-2xl" style={{
            backgroundColor: isDark ? '#182B43' : '#ffffff'
          }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#087F8C' }}>
                  Declaração de Presença
                </h2>
                <p className="text-sm mt-1" style={{ color: textSecondary }}>
                  Paciente: <strong style={{ color: '#087F8C' }}>{selectedPaciente.nome}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowDeclaracaoModal(false)}
                className="p-2 rounded-full transition-colors"
                style={{ color: '#087F8C' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Data da Sessão
                </label>
                <input
                  type="date"
                  value={declaracaoData.data}
                  onChange={(e) => setDeclaracaoData({ ...declaracaoData, data: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Hora de Início
                  </label>
                  <input
                    type="time"
                    value={declaracaoData.horaInicio}
                    onChange={(e) => setDeclaracaoData({ ...declaracaoData, horaInicio: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                    Hora de Término
                  </label>
                  <input
                    type="time"
                    value={declaracaoData.horaFim}
                    onChange={(e) => setDeclaracaoData({ ...declaracaoData, horaFim: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                      borderColor: '#DCE6EC',
                      color: '#087F8C'
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Profissional Responsável *
                </label>
                <input
                  type="text"
                  value={declaracaoData.profissionalNome}
                  onChange={(e) => setDeclaracaoData({ ...declaracaoData, profissionalNome: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Nome do fisioterapeuta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Registro Profissional (CREFITO)
                </label>
                <input
                  type="text"
                  value={declaracaoData.profissionalRegistro}
                  onChange={(e) => setDeclaracaoData({ ...declaracaoData, profissionalRegistro: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Ex: CREFITO-3/12345-F"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#087F8C' }}>
                  Observações (opcional)
                </label>
                <textarea
                  value={declaracaoData.observacoes}
                  onChange={(e) => setDeclaracaoData({ ...declaracaoData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    borderColor: '#DCE6EC',
                    color: '#087F8C'
                  }}
                  placeholder="Informações adicionais sobre a sessão..."
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => setShowDeclaracaoModal(false)}
                  className="flex-1 px-6 py-3 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: isDark ? '#0B1426' : '#F3F7F9',
                    color: '#087F8C'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGerarDeclaracao}
                  className="flex-1 px-6 py-3 rounded-lg transition-all duration-200 text-white"
                  style={{
                    background: 'linear-gradient(to right, #4CAF88, #3D9B75)'
                  }}
                >
                  Gerar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

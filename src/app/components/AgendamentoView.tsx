import { ModulePermission } from '../utils/permissions';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, User, MapPin, Star, List, Filter, CheckCircle2, XCircle, AlertCircle, Edit2, DoorOpen, FileText, UsersRound } from 'lucide-react';
import { notify, performAction, performActionWithResult, confirmAction } from '../utils/notifications';
import { professionalService } from '../services/professionalService';
import { Professional } from '../types/professional';
import { AppointmentRecord, schedulingService } from '../services/schedulingService';
import { agendaDateKey, agendaWeekDates, agendaWeekLabel, shiftAgendaWeek, startOfAgendaWeek } from '../utils/agendaCalendar';

type Appointment = AppointmentRecord;

interface AgendamentoViewProps {
  perms?: ModulePermission;
  isDark: boolean;
}

const STATUS_CFG = {
  confirmado: { label: 'Confirmado', color: '#35A978', bg: 'rgba(53,169,120,0.12)', icon: CheckCircle2 },
  pendente:   { label: 'Pendente',   color: '#E5A83B', bg: 'rgba(229,168,59,0.12)',  icon: AlertCircle },
  cancelado:  { label: 'Cancelado',  color: '#D95C5C', bg: 'rgba(217,92,92,0.12)',   icon: XCircle },
};

export function AgendamentoView({ isDark, perms }: AgendamentoViewProps) {
  const P = isDark ? '#67C8CE' : '#087F8C';
  const bg = isDark ? '#0B1426' : '#F4F8FB';
  const card = isDark ? '#182B43' : '#FFFFFF';
  const border = isDark ? '#31455F' : '#E4EDF3';
  const muted = isDark ? '#111F35' : '#EEF6FA';
  const inputBg = isDark ? '#203650' : '#F7FAFC';
  const textMain = isDark ? '#EDF4FC' : '#142C50';
  const textSub = isDark ? '#AFBFD3' : '#687E98';

  const [viewType, setViewType] = useState<'lista' | 'semana'>('lista');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfAgendaWeek(new Date()));
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedSala, setSelectedSala] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [clientesCadastrados, setClientesCadastrados] = useState<Array<{id: string; nome: string; email: string}>>([]);

  const [professores, setProfessores] = useState<string[]>([]);
  const [professionalRecords, setProfessionalRecords] = useState<Professional[]>([]);

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try { return JSON.parse(localStorage.getItem('agendamentos') || '[]'); } catch { return []; }
  });

  const blankForm: Omit<Appointment, 'id'> = { studentName: '', studentId: '', date: '', startTime: '', endTime: '', day: new Date().getDay(), room: '', professor: '', professorId: '', status: 'pendente', tipoAula: 'regular' };
  const [form, setForm] = useState(blankForm);

  const salas = ['Sala 1', 'Sala 2', 'Sala VIP'];
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  useEffect(() => {
    const data = localStorage.getItem('pacientes');
    if (data) setClientesCadastrados(JSON.parse(data).map((p: any) => ({ id: p.id, nome: p.nome, email: p.email })));
  }, []);

  useEffect(() => {
    const load = () => { const records = professionalService.list(); setProfessionalRecords(records); setProfessores(records.map(item => item.nome)); };
    load();
    window.addEventListener('pilamanager:professionals-updated', load);
    return () => window.removeEventListener('pilamanager:professionals-updated', load);
  }, []);

  useEffect(() => { localStorage.setItem('agendamentos', JSON.stringify(appointments)); }, [appointments]);

  const weekDates = agendaWeekDates(currentWeekStart);

  const navigateWeek = (dir: 'prev' | 'next') => {
    setCurrentWeekStart(start => shiftAgendaWeek(start, dir === 'next' ? 1 : -1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfAgendaWeek(new Date()));
  };

  const filteredAppointments = appointments.filter(a => {
    if (selectedProfessor && a.professor !== selectedProfessor) return false;
    if (selectedSala && a.room !== selectedSala) return false;
    if (selectedStatus && a.status !== selectedStatus) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!form.studentName || !form.date || !form.startTime || !form.endTime || !form.room || !form.professor) {
      notify('Preencha os campos obrigatórios.', 'warning'); return;
    }
    const saved = await performActionWithResult('agenda-create', () => schedulingService.save({ id: '', ...form, day: new Date(form.date + 'T12:00:00').getDay() }), 'Agendamento realizado.');
    if (!saved.ok) return;
    setAppointments(saved.value); setForm(blankForm); setShowNewAppointment(false);
  };

  const handleEdit = async () => {
    if (!selectedAppointment || !form.studentName || !form.date || !form.startTime || !form.endTime || !form.room || !form.professor) {
      notify('Preencha os campos obrigatórios.', 'warning'); return;
    }
    const saved = await performActionWithResult('agenda-edit:' + selectedAppointment.id, () => schedulingService.save({ id: selectedAppointment.id, ...form, day: new Date(form.date + 'T12:00:00').getDay(), createdAt: selectedAppointment.createdAt }, selectedAppointment.id), 'Agendamento atualizado.');
    if (!saved.ok) return;
    setAppointments(saved.value); setShowEditModal(false); setSelectedAppointment(null); setForm(blankForm);
  };

  const handleDelete = async (id: string) => {
    if (!await confirmAction('Excluir este agendamento?')) return;
    const next = appointments.filter(a => a.id !== id);
    if (!await performAction('agenda', () => localStorage.setItem('agendamentos', JSON.stringify(next)), 'Agendamento excluído.')) return;
    setAppointments(next);
  };

  const handleChangeStatus = async (status: Appointment['status']) => {
    if (!selectedAppointment) return;
    if (status === 'cancelado' && !await confirmAction('Cancelar este agendamento?')) return;
    const next = appointments.map(a => a.id === selectedAppointment.id ? { ...a, status } : a);
    if (!await performAction('agenda', () => localStorage.setItem('agendamentos', JSON.stringify(next)), status === 'cancelado' ? 'Agendamento cancelado.' : 'Situação do agendamento atualizada.')) return;
    setAppointments(next); setShowStatusModal(false); setSelectedAppointment(null);
  };

  const openEdit = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setForm({ studentName: apt.studentName, studentId: apt.studentId || '', date: apt.date || '', startTime: apt.startTime, endTime: apt.endTime, day: apt.day, room: apt.room, professor: apt.professor, professorId: apt.professorId || professionalRecords.find(item => item.nome === apt.professor)?.id || '', status: apt.status, tipoAula: apt.tipoAula, createdAt: apt.createdAt });
    setShowEditModal(true);
  };

  const openStatus = (apt: Appointment) => { setSelectedAppointment(apt); setShowStatusModal(true); };

  const todayConfirmados = filteredAppointments.filter(a => a.status === 'confirmado').length;
  const todayPendentes = filteredAppointments.filter(a => a.status === 'pendente').length;
  const todayCancelados = filteredAppointments.filter(a => a.status === 'cancelado').length;

  const fieldStyle = { backgroundColor: inputBg, borderColor: border, color: textMain, outlineColor: P };
  const selectedProfessional = professionalRecords.find(item => item.id === form.professorId || item.nome === form.professor);
  const availability: { slots: Array<{ startTime: string; endTime: string; students: number }>; error?: string } = selectedProfessional && form.date ? schedulingService.availableSlots(selectedProfessional.id, form.date, selectedAppointment?.id) : { slots: [] };

  const renderFormFields = () => (
    <div className="appointment-form-fields grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block mb-1 text-sm font-medium" style={{ color: textMain }}>Paciente *</label>
        <div className="pm-control-icon"><User aria-hidden="true"/><select value={form.studentId || ''} onChange={e => {
          const c = clientesCadastrados.find(x => x.id === e.target.value);
          setForm(f => ({ ...f, studentId: e.target.value, studentName: c?.nome || f.studentName }));
        }} className="w-full px-3 py-2.5 rounded-xl border focus:outline-none" style={fieldStyle}>
          <option value="">Selecione ou digite abaixo</option>
          {clientesCadastrados.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select></div>
        {!form.studentId && (
          <input type="text" value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border mt-2 focus:outline-none" style={fieldStyle} placeholder="Ou digite o nome do paciente" />
        )}
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium" style={{ color: textMain }}>Profissional *</label>
        <div className="pm-control-icon"><UsersRound aria-hidden="true"/><select value={form.professorId || ''} onChange={e => { const professional = professionalRecords.find(item => item.id === e.target.value); setForm(f => ({ ...f, professorId: professional?.id || '', professor: professional?.nome || '', date: '', startTime: '', endTime: '' })); }} className="w-full px-3 py-2.5 rounded-xl border focus:outline-none" style={fieldStyle}>
          <option value="">Selecione</option>
          {professionalRecords.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select></div>
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium" style={{ color: textMain }}>Sala *</label>
        <div className="pm-control-icon"><DoorOpen aria-hidden="true"/><select value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border focus:outline-none" style={fieldStyle}>
          <option value="">Selecione</option>
          {salas.map(s => <option key={s} value={s}>{s}</option>)}
        </select></div>
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium" style={{ color: textMain }}>Data *</label>
        <div className="pm-control-icon"><CalendarIcon aria-hidden="true"/><input type="date" min={new Date().toISOString().slice(0, 10)} disabled={!selectedProfessional} value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value, day: e.target.value ? new Date(`${e.target.value}T12:00:00`).getDay() : f.day, startTime: '', endTime: '' }))} className="w-full px-3 py-2.5 rounded-xl border focus:outline-none disabled:opacity-50" style={fieldStyle} /></div>
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium" style={{ color: textMain }}>Tipo de Aula</label>
        <div className="pm-control-icon"><FileText aria-hidden="true"/><select value={form.tipoAula} onChange={e => setForm(f => ({ ...f, tipoAula: e.target.value as any }))} className="w-full px-3 py-2.5 rounded-xl border focus:outline-none" style={fieldStyle}>
          <option value="regular">Regular</option>
          <option value="experimental">Experimental</option>
        </select></div>
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium" style={{ color: textMain }}>Horário *</label>
        <div className="pm-control-icon"><Clock aria-hidden="true"/><select disabled={!form.date || availability.slots.length === 0} value={form.startTime} onChange={e => { const slot = availability.slots.find(item => item.startTime === e.target.value); setForm(f => ({ ...f, startTime: slot?.startTime || '', endTime: slot?.endTime || '' })); }} className="w-full px-3 py-2.5 rounded-xl border focus:outline-none disabled:opacity-50" style={fieldStyle}>
          <option value="">Selecione</option>
          {availability.slots.map(slot => <option key={slot.startTime} value={slot.startTime}>{slot.startTime}–{slot.endTime} · este horário possui {slot.students} aluno(s)</option>)}
        </select></div>
      </div>
      <div>
        <label className="block mb-1 text-sm font-medium" style={{ color: textMain }}>Término</label>
        <div className="pm-control-icon"><Clock aria-hidden="true"/><input type="time" value={form.endTime} readOnly className="w-full px-3 py-2.5 rounded-xl border focus:outline-none opacity-70" style={fieldStyle} /></div>
      </div>
      {selectedProfessional && selectedProfessional.horarios.length === 0 && <p className="col-span-2 text-sm" style={{ color: '#D95C5C' }}>O profissional não possui horário cadastrado.</p>}
      {form.date && availability.error && <p className="col-span-2 text-sm" style={{ color: '#D95C5C' }}>{availability.error}</p>}
    </div>
  );

  return (
    <div className="p-5" style={{ backgroundColor: bg }}>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: textMain }}>Agendamento</h2>
          <p className="text-sm mt-0.5" style={{ color: textSub }}>Gerencie a agenda do estúdio</p>
        </div>
        {(perms?.criar !== false) && (
          <button
            onClick={() => { setForm(blankForm); setShowNewAppointment(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: P }}
          >
            <Plus className="w-4 h-4" />Novo Agendamento
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="appointment-stats grid grid-cols-3 gap-2.5 mb-4">
        {[
          { label: 'Total',       value: filteredAppointments.length, color: P,        bg: `${P}12` },
          { label: 'Confirmados', value: todayConfirmados,            color: '#35A978', bg: 'rgba(53,169,120,0.1)' },
          { label: 'Pendentes',   value: todayPendentes,              color: '#E5A83B', bg: 'rgba(229,168,59,0.1)' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border" style={{ backgroundColor: card, borderColor: border }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
              <span className="font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
            </div>
            <span className="text-sm" style={{ color: textSub }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: border, backgroundColor: card }}>
          {([['lista', List, 'Lista'], ['semana', CalendarIcon, 'Semana']] as const).map(([type, Icon, label]) => (
            <button key={type} onClick={() => setViewType(type as any)}
              aria-pressed={viewType === type} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all"
              style={{ backgroundColor: viewType === type ? P : 'transparent', color: viewType === type ? '#fff' : textSub }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Week navigation (only in semana view) */}
        {viewType === 'semana' && (
          <div className="pm-week-navigation" role="group" aria-label="Navegação por semana">
            <button type="button" onClick={() => navigateWeek('prev')} className="pm-week-arrow" aria-label="Semana anterior" title="Semana anterior">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <div className="pm-week-period" aria-live="polite"><small>Semana de domingo a sábado</small><strong>{agendaWeekLabel(currentWeekStart)}</strong></div>
            <button type="button" onClick={() => navigateWeek('next')} className="pm-week-arrow" aria-label="Próxima semana" title="Próxima semana">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <button type="button" onClick={goToToday} className="pm-week-today" title="Voltar à semana atual">Hoje</button>
          </div>
        )}

        {/* Filter toggle */}
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ml-auto"
          style={{ borderColor: showFilters ? P : border, color: showFilters ? P : textSub, backgroundColor: showFilters ? `${P}10` : card }}>
          <Filter className="w-3.5 h-3.5" />Filtros
          {(selectedProfessor || selectedSala || selectedStatus) && <span className="w-1.5 h-1.5 rounded-full ml-1" style={{ backgroundColor: P }} />}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl border p-4 mb-4 grid grid-cols-3 gap-3" style={{ backgroundColor: card, borderColor: border }}>
          {[
            { label: 'Profissional', val: selectedProfessor, set: setSelectedProfessor, options: professores, placeholder: 'Todos' },
            { label: 'Sala', val: selectedSala, set: setSelectedSala, options: salas, placeholder: 'Todas' },
          ].map(({ label, val, set, options, placeholder }) => (
            <div key={label}>
              <label className="block mb-1 text-xs font-medium" style={{ color: textSub }}>{label}</label>
              <select value={val} onChange={e => set(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={fieldStyle}>
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block mb-1 text-xs font-medium" style={{ color: textSub }}>Status</label>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={fieldStyle}>
              <option value="">Todos</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          {(selectedProfessor || selectedSala || selectedStatus) && (
            <div className="col-span-3 flex justify-end">
              <button onClick={() => { setSelectedProfessor(''); setSelectedSala(''); setSelectedStatus(''); }} className="text-xs font-medium" style={{ color: '#D95C5C' }}>Limpar filtros</button>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewType === 'lista' && (
        <div className="pm-agenda-list">
          {Array.from(new Set(filteredAppointments.map(a => a.date || `legacy-${a.day}`))).sort().map(dateKey => {
            const dayApts = filteredAppointments.filter(a => (a.date || `legacy-${a.day}`) === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
            const dayIndex = dayApts[0]?.day ?? 0;
            const dayName = dateKey.startsWith('legacy-') ? DAYS_FULL[dayIndex] : new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            if (dayApts.length === 0) return null;
            return (
              <div key={dateKey} className="pm-agenda-day rounded-2xl overflow-hidden border" style={{ backgroundColor: card, borderColor: border }}>
                {/* Day header */}
                <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${border}`, backgroundColor: muted }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
                    <CalendarIcon size={14} className="text-white" />
                  </div>
                  <span className="font-semibold text-sm" style={{ color: textMain }}>{dayName}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${P}15`, color: P }}>{dayApts.length} aula{dayApts.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Appointments */}
                <div className="pm-agenda-rows">
                  {dayApts.map(apt => {
                    const s = STATUS_CFG[apt.status];
                    const Ic = s.icon;
                    return (
                      <div key={apt.id} className="pm-agenda-row flex items-center gap-4 transition-all group" style={{ borderColor: border }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = muted)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        {/* Time */}
                        <div className="flex-shrink-0 w-16 text-center">
                          <p className="font-bold text-sm" style={{ color: P }}>{apt.startTime}</p>
                          <p style={{ color: textSub, fontSize: '0.68rem' }}>{apt.endTime}</p>
                        </div>

                        {/* Color bar */}
                        <div className="pm-agenda-status-bar" aria-hidden="true" style={{ backgroundColor: s.color }} />

                        {/* Avatar + Name */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: P, fontSize: '0.75rem' }}>
                            {apt.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-sm truncate" style={{ color: textMain }}>{apt.studentName}</p>
                              {apt.tipoAula === 'experimental' && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(229,168,59,0.15)', color: '#E5A83B', fontSize: '0.65rem', fontWeight: 600 }}>
                                  <Star className="w-2.5 h-2.5" fill="currentColor" />EXP
                                </span>
                              )}
                            </div>
                            <p style={{ color: textSub, fontSize: '0.72rem' }}>
                              {apt.professor} · {apt.room} · este horário possui {appointments.filter(item => item.status !== 'cancelado' && item.professor === apt.professor && item.startTime === apt.startTime && (apt.date ? item.date === apt.date : item.day === apt.day)).length} aluno(s)
                            </p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: s.bg }}>
                          <Ic className="w-3 h-3" style={{ color: s.color }} />
                          <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                        </div>

                        {/* Actions */}
                        <div className="pm-agenda-actions flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all">
                          <button onClick={() => openEdit(apt)} className="p-1.5 rounded-lg transition-all" style={{ color: textSub }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${P}15`; e.currentTarget.style.color = P; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSub; }}
                            title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openStatus(apt)} className="p-1.5 rounded-lg transition-all" style={{ color: textSub }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${P}15`; e.currentTarget.style.color = P; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSub; }}
                            title="Alterar status">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(apt.id)} className="p-1.5 rounded-lg transition-all" style={{ color: textSub }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(217,92,92,0.1)'; e.currentTarget.style.color = '#D95C5C'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSub; }}
                            title="Excluir">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredAppointments.length === 0 && (
            <div className="text-center py-16 rounded-2xl border" style={{ backgroundColor: card, borderColor: border }}>
              <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: P }} />
              <p className="font-medium" style={{ color: textMain }}>Nenhum agendamento encontrado</p>
              <p className="text-sm mt-1" style={{ color: textSub }}>Tente ajustar os filtros ou crie um novo agendamento.</p>
            </div>
          )}
        </div>
      )}

      {/* WEEK CALENDAR VIEW */}
      {viewType === 'semana' && (
        <div className="pm-agenda-calendar rounded-2xl border overflow-hidden" style={{ backgroundColor: card, borderColor: border }}>
          <div className="pm-calendar-summary">
            <div><strong>Agenda da semana</strong><p>Cada coluna é um dia. Os horários aparecem à esquerda. Selecione uma aula para ver sua situação.</p></div>
            <div className="pm-calendar-legend" aria-label="Legenda dos agendamentos">{Object.entries(STATUS_CFG).map(([status, config]) => <span key={status}><i style={{backgroundColor:config.color}} aria-hidden="true"/>{config.label}</span>)}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="pm-week-grid w-full" style={{ minWidth: '1050px', tableLayout: 'fixed' }}>
              <caption className="sr-only">Agendamentos de {agendaWeekLabel(currentWeekStart)}</caption>
              <thead>
                <tr style={{ backgroundColor: muted }}>
                  <th scope="col" className="py-3 px-3 text-left w-16" style={{ color: textSub, fontSize: '0.75rem', fontWeight: 600, borderBottom: `1px solid ${border}` }}>Horário</th>
                  {weekDates.map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <th key={i} scope="col" className="py-3 px-2 text-center" data-today={isToday || undefined} style={{ borderBottom: `1px solid ${border}`, borderLeft: `1px solid ${border}`, minWidth: '140px' }}>
                        <p style={{ color: textSub, fontSize: '0.7rem', fontWeight: 500 }}>{DAYS[date.getDay()]}</p>
                        <div className="pm-week-day-number" style={{ backgroundColor: isToday ? P : 'transparent', color: isToday ? '#fff' : textMain }}>
                          {date.getDate()}{isToday && <span className="sr-only">, hoje</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 13 }, (_, i) => i + 7).map(hour => (
                  <tr key={hour} style={{ borderTop: `1px solid ${border}`, height: '80px' }}>
                    <th scope="row" className="px-2 py-3 align-top text-left" style={{ color: textSub, fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{String(hour).padStart(2,'0')}:00</th>
                    {weekDates.map((date, dayIndex) => {
                      const dateKey = agendaDateKey(date);
                      const apts = filteredAppointments.filter(a => (a.date ? a.date === dateKey : a.day === date.getDay()) && parseInt(a.startTime) === hour);
                      return (
                        <td key={dayIndex} className="p-2 align-top" data-today={date.toDateString() === new Date().toDateString() || undefined} style={{ borderLeft: `1px solid ${border}`, verticalAlign: 'top' }}>
                          {apts.length > 1 && <p className="pm-simultaneous-label">{apts.length} aulas neste horário</p>}
                          {apts.map(apt => {
                            const s = STATUS_CFG[apt.status];
                            return (
                              <button type="button" key={apt.id} className="pm-calendar-appointment"
                                style={{ backgroundColor: s.bg, borderLeftColor: s.color }} title={[apt.studentName, apt.professor, apt.room, s.label].filter(Boolean).join(' · ')} aria-label={[`${apt.startTime} às ${apt.endTime}`, apt.studentName, apt.professor, apt.room, s.label].filter(Boolean).join(', ')}
                                onClick={() => openStatus(apt)}>
                                <span className="pm-calendar-time" style={{color: textMain}}>{apt.startTime}–{apt.endTime}</span>
                                <strong style={{color: textMain}}>{apt.studentName}</strong>
                                <span style={{color: textSub}}>{apt.professor}</span>
                                <span style={{color: textSub}}>{apt.room}</span>
                                <span className="pm-calendar-status" style={{color: s.color}}>{s.label}</span>
                                {apt.tipoAula === 'experimental' && <Star className="w-2.5 h-2.5 absolute top-0.5 right-0.5" style={{ color: '#E5A83B' }} fill="currentColor" />}
                              </button>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Novo / Editar */}
      {(showNewAppointment || showEditModal) && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="pm-panel appointment-form-dialog w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${border}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: P }}>
                  <CalendarIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div><h2 className="font-semibold" style={{ color: textMain }}>{showEditModal ? 'Editar Agendamento' : 'Novo Agendamento'}</h2><p>Preencha as informações do agendamento.</p></div>
              </div>
              <button onClick={() => { setShowNewAppointment(false); setShowEditModal(false); setForm(blankForm); }} className="p-1.5 rounded-lg" style={{ color: textSub }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="appointment-form-scroll min-w-0 p-6 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(90vh - 130px)' }}>
              {renderFormFields()}
            </div>
            <div className="pm-panel-footer px-6 py-4 flex gap-2 justify-end" style={{ borderTop: `1px solid ${border}` }}>
              <button onClick={() => { setShowNewAppointment(false); setShowEditModal(false); setForm(blankForm); }} className="px-4 py-2 rounded-xl text-sm border font-medium" style={{ borderColor: border, color: textSub }}>Cancelar</button>
              <button onClick={showEditModal ? handleEdit : handleCreate} className="px-5 py-2 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: P }}>
                {showEditModal ? 'Salvar Alterações' : 'Criar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Status */}
      {showStatusModal && selectedAppointment && (
        <div className="pm-panel-overlay fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="pm-panel w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: card, border: `1px solid ${border}` }} role="dialog" aria-modal="true">
            <div className="pm-panel-header flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${border}` }}>
              <p className="font-semibold" style={{ color: textMain }}>Alterar Status</p>
              <button onClick={() => { setShowStatusModal(false); setSelectedAppointment(null); }} className="p-1.5 rounded-lg" style={{ color: textSub }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {/* Appointment info */}
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ backgroundColor: muted }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: P, fontSize: '0.8rem' }}>
                  {selectedAppointment.studentName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: textMain }}>{selectedAppointment.studentName}</p>
                  <p style={{ color: textSub, fontSize: '0.72rem' }}>{DAYS_FULL[selectedAppointment.day]} · {selectedAppointment.startTime}–{selectedAppointment.endTime} · {selectedAppointment.room}</p>
                </div>
              </div>

              <div className="space-y-2">
                {(['confirmado', 'pendente', 'cancelado'] as const).map(status => {
                  const s = STATUS_CFG[status];
                  const Ic = s.icon;
                  const isCurrent = selectedAppointment.status === status;
                  return (
                    <button key={status} onClick={() => !isCurrent && handleChangeStatus(status)} disabled={isCurrent}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                      style={{ borderColor: isCurrent ? s.color : border, backgroundColor: isCurrent ? s.bg : 'transparent', cursor: isCurrent ? 'default' : 'pointer', opacity: isCurrent ? 1 : 0.8 }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = s.bg; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <Ic className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                      <span className="font-medium text-sm flex-1" style={{ color: s.color }}>{s.label}</span>
                      {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: s.color, color: '#fff' }}>Atual</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

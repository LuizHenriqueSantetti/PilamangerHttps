import { Professional } from '../types/professional';
import { professionalService } from './professionalService';
import { storageService } from './storageService';

export interface AppointmentRecord {
  id: string;
  studentName: string;
  studentId?: string;
  date?: string;
  startTime: string;
  endTime: string;
  day: number;
  room: string;
  professor: string;
  professorId?: string;
  status: 'confirmado' | 'pendente' | 'cancelado';
  tipoAula: 'regular' | 'experimental';
  createdAt?: string;
}

export interface AvailableSlot { startTime: string; endTime: string; students: number }

const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace('-feira', '').trim();
const minutes = (value: string) => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const overlaps = (startA: number, endA: number, startB: number, endB: number) => startA < endB && endA > startB;

function localDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getProfessional(idOrName: string): Professional | null {
  return professionalService.list({ includeInactive: true }).find(item => item.id === idOrName || item.nome === idOrName) || null;
}

function validateBase(professional: Professional | null, date: string): string | null {
  if (!professional || professional.status !== 'ativo') return 'Profissional inválido ou inativo.';
  if (!date || Number.isNaN(localDate(date).getTime())) return 'Data inválida.';
  const selected = localDate(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const compared = new Date(selected); compared.setHours(0, 0, 0, 0);
  if (compared < today) return 'Não é permitido agendar no passado.';
  if (!professional.horarios.length) return 'O profissional não possui horário cadastrado.';
  if (professional.indisponibilidades.some(period => period.inicio && period.fim && date >= period.inicio && date <= period.fim)) return 'O profissional está afastado ou de férias nesta data.';
  return null;
}

export const schedulingService = {
  list(): AppointmentRecord[] { return storageService.get<AppointmentRecord[]>('agendamentos', []); },

  availableSlots(professionalId: string, date: string, ignoreAppointmentId?: string): { slots: AvailableSlot[]; error?: string } {
    const professional = getProfessional(professionalId);
    const baseError = validateBase(professional, date);
    if (baseError) return { slots: [], error: baseError };
    const selected = localDate(date);
    const dayName = DAY_NAMES[selected.getDay()];
    const shifts = professional!.horarios.filter(slot => normalize(slot.dia) === dayName && slot.inicio < slot.fim);
    if (!shifts.length) return { slots: [], error: 'O profissional não atende no dia escolhido.' };
    const duration = Math.max(15, Number(professional!.duracaoAula || 60));
    const intervals = professional!.intervalos.filter(slot => normalize(slot.dia) === dayName);
    const blocks = professional!.bloqueios.filter(block => block.data === date);
    const appointments = this.list().filter(item => item.id !== ignoreAppointmentId && item.status !== 'cancelado' && (item.professorId === professional!.id || item.professor === professional!.nome) && item.date === date);
    const now = new Date();
    const slots: AvailableSlot[] = [];
    for (const shift of shifts) {
      const shiftStart = minutes(shift.inicio); const shiftEnd = minutes(shift.fim);
      for (let start = shiftStart; start + duration <= shiftEnd; start += duration) {
        const end = start + duration;
        if (intervals.some(item => overlaps(start, end, minutes(item.inicio), minutes(item.fim)))) continue;
        if (blocks.some(item => overlaps(start, end, minutes(item.inicio), minutes(item.fim)))) continue;
        const slotDate = localDate(date); slotDate.setHours(Math.floor(start / 60), start % 60, 0, 0);
        if (slotDate <= now) continue;
        const students = appointments.filter(item => item.startTime === time(start) && item.endTime === time(end)).length;
        slots.push({ startTime: time(start), endTime: time(end), students });
      }
    }
    return { slots };
  },

  validate(input: AppointmentRecord, ignoreAppointmentId?: string): string | null {
    const professional = getProfessional(input.professorId || input.professor);
    const baseError = validateBase(professional, input.date || '');
    if (baseError) return baseError;
    const availability = this.availableSlots(professional!.id, input.date!, ignoreAppointmentId);
    if (availability.error) return availability.error;
    if (!availability.slots.some(slot => slot.startTime === input.startTime && slot.endTime === input.endTime)) {
      return 'Horário fora do expediente, durante intervalo, bloqueado ou ultrapassando o fim do turno.';
    }
    const duplicateStudent = this.list().some(item => item.id !== ignoreAppointmentId && item.status !== 'cancelado' && item.date === input.date && item.startTime === input.startTime && (item.studentId && item.studentId === input.studentId));
    if (duplicateStudent) return 'Este paciente já possui agendamento neste horário.';
    return null;
  },

  save(input: AppointmentRecord, id?: string): AppointmentRecord[] {
    const current = this.list();
    const error = this.validate(input, id);
    if (error) throw new Error(error);
    const record = { ...input, id: id || crypto.randomUUID(), createdAt: input.createdAt || new Date().toISOString() };
    const next = id ? current.map(item => item.id === id ? record : item) : [...current, record];
    const result = storageService.set('agendamentos', next);
    if (!result.ok) throw result.error || new Error('Falha ao persistir o agendamento.');
    window.dispatchEvent(new CustomEvent('pilamanager:data-changed'));
    return next;
  },
};

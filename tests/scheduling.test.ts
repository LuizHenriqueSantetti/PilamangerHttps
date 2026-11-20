import { describe, expect, it } from 'vitest';
import { schedulingService } from '../src/app/services/schedulingService';

function futureMonday(): string {
  const date = new Date();
  date.setDate(date.getDate() + ((8 - date.getDay()) % 7 || 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function seedProfessional() {
  localStorage.setItem('profissionaisMigrationV2', JSON.stringify(true));
  localStorage.setItem('profissionais', JSON.stringify([{
    id: 'prof-1', nome: 'Fulano', status: 'ativo', tipo: 'fisioterapeuta',
    horarios: [{ dia: 'Segunda', inicio: '08:00', fim: '12:00' }],
    duracaoAula: 60,
    intervalos: [{ dia: 'Segunda', inicio: '10:00', fim: '11:00' }],
    bloqueios: [], indisponibilidades: [],
  }]));
}

describe('disponibilidade e gravação de agendamentos', () => {
  it('oferece somente aulas completas dentro do turno e exclui intervalos', () => {
    seedProfessional();
    const result = schedulingService.availableSlots('prof-1', futureMonday());
    expect(result.error).toBeUndefined();
    expect(result.slots.map(slot => `${slot.startTime}-${slot.endTime}`)).toEqual(['08:00-09:00', '09:00-10:00', '11:00-12:00']);
  });

  it('permite vários alunos no mesmo horário e informa a ocupação', () => {
    seedProfessional();
    const date = futureMonday();
    const base = { date, day: 1, startTime: '08:00', endTime: '09:00', room: 'Sala 1', professor: 'Fulano', professorId: 'prof-1', status: 'confirmado' as const, tipoAula: 'regular' as const };
    schedulingService.save({ id: '', ...base, studentId: 'student-1', studentName: 'Ana' });
    expect(schedulingService.availableSlots('prof-1', date).slots[0].students).toBe(1);
    expect(() => schedulingService.save({ id: '', ...base, studentId: 'student-2', studentName: 'Bia' })).not.toThrow();
    expect(schedulingService.availableSlots('prof-1', date).slots[0].students).toBe(2);
  });

  it('bloqueia passado, intervalo e duplicidade do mesmo paciente', () => {
    seedProfessional();
    const date = futureMonday();
    const base = { date, day: 1, startTime: '08:00', endTime: '09:00', room: 'Sala 1', professor: 'Fulano', professorId: 'prof-1', status: 'confirmado' as const, tipoAula: 'regular' as const, studentId: 'student-1', studentName: 'Ana' };
    schedulingService.save({ id: '', ...base });
    expect(() => schedulingService.save({ id: '', ...base })).toThrow('já possui');
    expect(schedulingService.validate({ id: '', ...base, studentId: 'student-2', startTime: '10:00', endTime: '11:00' })).toContain('fora do expediente');
    expect(schedulingService.availableSlots('prof-1', '2020-01-01').error).toContain('passado');
  });
});

export interface ProfessionalClass {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  room: string;
  status: 'confirmado' | 'pendente' | 'cancelado';
  tipoAula: 'regular' | 'experimental';
}

export interface ProfessionalSchedule {
  appointments: ProfessionalClass[];
  undatedCount: number;
  today: string;
  currentTime: string;
}

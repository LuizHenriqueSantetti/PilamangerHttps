/** Civil dates: keep week navigation independent from UTC and daylight-saving shifts. */
export function startOfAgendaWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function shiftAgendaWeek(start: Date, direction: -1 | 1): Date {
  const next = startOfAgendaWeek(start);
  next.setDate(next.getDate() + direction * 7);
  return next;
}

export function agendaWeekDates(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = startOfAgendaWeek(start);
    date.setDate(date.getDate() + index);
    return date;
  });
}

export function agendaDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function agendaWeekLabel(start: Date): string {
  const dates = agendaWeekDates(start);
  const format = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${format(dates[0])} a ${format(dates[6])}`;
}

export function professionalAgendaPeriod(anchor: Date, mode: 'semana' | 'mes') {
  const dates = mode === 'semana' ? agendaWeekDates(anchor) : Array.from({ length: new Date(anchor.getFullYear(), anchor.getMonth()+1, 0).getDate() }, (_,index) => new Date(anchor.getFullYear(), anchor.getMonth(), index+1,12));
  return { dates, start: agendaDateKey(dates[0]), end: agendaDateKey(dates[dates.length-1]) };
}

export function shiftProfessionalAgenda(anchor: Date, mode: 'semana' | 'mes', direction: -1 | 1) {
  return mode === 'semana' ? shiftAgendaWeek(anchor,direction) : new Date(anchor.getFullYear(),anchor.getMonth()+direction,1,12);
}

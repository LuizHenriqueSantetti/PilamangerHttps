export function studioDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Preserve existing history, but never create or move an operational record into the past.
export function validateOperationalDates(key: string, previous: any[], next: any[], today: string): string | null {
  const fields = key === 'agendamentos' ? ['date', 'data'] : key === 'pagamentos' ? ['vencimento'] : key === 'pacientes' ? ['dataCadastro'] : [];
  for (const item of next) {
    const old = previous.find(record => String(record.id) === String(item.id));
    const date = key === 'agendamentos' ? item.date || item.data : item[fields[0]];
    const oldDate = key === 'agendamentos' ? old?.date || old?.data : old?.[fields[0]];
    if (!fields.length || (old && date === oldDate)) continue;
    if (!isCalendarDate(date)) return 'Informe uma data válida.';
    if (date < today) return 'Não é permitido criar ou transferir registros para datas passadas.';
  }
  return null;
}

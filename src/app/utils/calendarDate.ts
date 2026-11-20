/** Calendar dates are not UTC instants. Preserve their civil day in every locale. */
export function formatCalendarDate(value: string, locale = 'pt-BR'): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale);
}

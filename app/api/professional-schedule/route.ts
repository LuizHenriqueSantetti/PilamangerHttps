import { env } from "../../../src/server/runtime";
import { json, requireSession } from '../../../src/server/auth';
import { isCalendarDate, studioDate } from '../../../src/server/operationalDates';
import type { ProfessionalClass } from '../../../src/app/types/professionalSchedule';

const normalizedName = (value: unknown) => String(value || '').trim().toLocaleLowerCase('pt-BR');

export async function GET(request: Request) {
  // Same built-in profiles that may consult Equipe; no new clinical write access.
  const auth = await requireSession(request, ['gerencia', 'admin', 'recepcao']);
  if ('error' in auth) return auth.error;
  const params = new URL(request.url).searchParams;
  const professionalId = params.get('professionalId') || '';
  const start = params.get('start');
  const end = params.get('end');
  if (!professionalId || professionalId.length > 100 || !isCalendarDate(start) || !isCalendarDate(end) || start > end || new Date(end).getTime() - new Date(start).getTime() > 41 * 86_400_000) {
    return json({ error: 'Selecione um profissional e um período válido de até 42 dias.' }, { status: 400 });
  }
  const result = await env.DB.prepare("SELECT key, value FROM app_storage WHERE key IN ('profissionais', 'agendamentos')").all<{key: string; value: string}>();
  let entries: Record<string, any>;
  try { entries = Object.fromEntries((result.results || []).map(row => [row.key, JSON.parse(row.value)])); }
  catch { return json({ error: 'Não foi possível consultar a agenda. Tente novamente.' }, { status: 503 }); }
  if ((entries.profissionais && !Array.isArray(entries.profissionais)) || (entries.agendamentos && !Array.isArray(entries.agendamentos))) return json({ error: 'Não foi possível consultar a agenda. Tente novamente.' }, { status: 503 });
  const professionals = (entries.profissionais || []).filter(item => item && !item.deletedAt);
  const professional = professionals.find(item => String(item.id) === professionalId);
  if (!professional) return json({ error: 'Profissional não encontrado.' }, { status: 404 });
  // Old records without an ID may match by name only when it is unambiguous.
  const name = normalizedName(professional.nome || professional.name);
  const uniqueName = name && professionals.filter(item => normalizedName(item.nome || item.name) === name).length === 1;
  let undatedCount = 0;
  const appointments: ProfessionalClass[] = [];
  for (const raw of entries.agendamentos || []) {
    if (!raw || typeof raw !== 'object') continue;
    const belongs = raw.professorId ? String(raw.professorId) === professionalId : uniqueName && normalizedName(raw.professor) === name;
    if (!belongs) continue;
    if (!isCalendarDate(raw.date)) { undatedCount++; continue; }
    if (raw.date < start || raw.date > end) continue;
    appointments.push({
      id: String(raw.id), date: raw.date, startTime: String(raw.startTime || ''), endTime: String(raw.endTime || ''),
      studentName: String(raw.studentName || ''), room: String(raw.room || ''),
      status: ['confirmado','pendente','cancelado'].includes(raw.status) ? raw.status : 'pendente',
      tipoAula: raw.tipoAula === 'experimental' ? 'experimental' : 'regular',
    });
  }
  appointments.sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.studentName.localeCompare(b.studentName));
  const now = new Date();
  const currentTime = new Intl.DateTimeFormat('en-GB', {timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(now);
  return json({ appointments, undatedCount, today: studioDate(now), currentTime });
}

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, RefreshCw, X } from 'lucide-react';
import type { Professional } from '../types/professional';
import type { ProfessionalSchedule } from '../types/professionalSchedule';
import { agendaDateKey, agendaWeekLabel, professionalAgendaPeriod, shiftProfessionalAgenda } from '../utils/agendaCalendar';

const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const STATUS = {
  confirmado: {label:'Confirmado',color:'#35A978'},
  pendente: {label:'Pendente',color:'#E5A83B'},
  cancelado: {label:'Cancelado',color:'#D95C5C'},
};

export function ProfessionalScheduleModal({professional,onClose}: {professional: Professional; onClose: () => void}) {
  const [mode,setMode] = useState<'semana'|'mes'>('semana');
  const [anchor,setAnchor] = useState(() => new Date());
  const [selectedDay,setSelectedDay] = useState<string | null>(null);
  const [showCanceled,setShowCanceled] = useState(false);
  const [data,setData] = useState<ProfessionalSchedule | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [revision,setRevision] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const {dates,start,end} = useMemo(() => professionalAgendaPeriod(anchor,mode),[anchor,mode]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    const params = new URLSearchParams({professionalId:professional.id,start,end});
    fetch(`/api/professional-schedule?${params}`,{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      .then(async response => {
        const result = await response.json() as ProfessionalSchedule & {error?: string};
        if (!response.ok) {
          if (response.status === 401) window.dispatchEvent(new Event('pilamanager:session-expired'));
          throw new Error(response.status === 403 ? 'Você não possui permissão para consultar esta agenda.' : result.error || 'Não foi possível carregar as aulas. Tente novamente.');
        }
        if (!controller.signal.aborted) setData(result);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Não foi possível carregar as aulas. Tente novamente.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[professional.id,start,end,revision]);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]') || []);
      const first = focusable[0], last = focusable[focusable.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown',keyboard,true);
    return () => { document.removeEventListener('keydown',keyboard,true); trigger?.focus(); };
  },[onClose]);

  const classes = useMemo(() => (data?.appointments || []).filter(item => showCanceled || item.status !== 'cancelado'),[data,showCanceled]);
  const visible = classes.filter(item => !selectedDay || item.date === selectedDay);
  const grouped = Array.from(new Set(visible.map(item => item.date)));
  const upcoming = (data?.appointments || []).filter(item => item.status !== 'cancelado' && (item.date > data!.today || item.date === data!.today && item.startTime >= data!.currentTime)).length;
  const changePeriod = (direction: -1|1) => { setAnchor(value => shiftProfessionalAgenda(value,mode,direction)); setSelectedDay(null); };

  return <div className="pm-panel-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
    <div ref={dialogRef} className="pm-panel pm-professional-agenda" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="pm-panel-header flex items-start justify-between">
        <div className="pm-panel-heading"><div className="pm-panel-heading-icon"><CalendarDays aria-hidden="true"/></div><div><h2 id={titleId}>Agenda do profissional</h2><p>{professional.nome}</p></div></div>
        <button type="button" onClick={onClose} aria-label="Fechar agenda do profissional"><X aria-hidden="true"/></button>
      </header>
      <div className="pm-professional-agenda-body">
        <div className="pm-professional-agenda-toolbar">
          <div className="pm-schedule-modes" role="group" aria-label="Visualização da agenda do profissional">
            <button type="button" aria-pressed={mode === 'semana'} onClick={() => {setMode('semana');setSelectedDay(null);}}>Semana</button>
            <button type="button" aria-pressed={mode === 'mes'} onClick={() => {setMode('mes');setSelectedDay(null);}}>Mês</button>
          </div>
          <div className="pm-week-navigation" role="group" aria-label="Período da agenda do profissional">
            <button type="button" className="pm-week-arrow" onClick={() => changePeriod(-1)} aria-label="Período anterior"><ChevronLeft aria-hidden="true"/></button>
            <strong aria-live="polite">{mode === 'semana' ? agendaWeekLabel(anchor) : anchor.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</strong>
            <button type="button" className="pm-week-arrow" onClick={() => changePeriod(1)} aria-label="Próximo período"><ChevronRight aria-hidden="true"/></button>
            <button type="button" className="pm-week-today" onClick={() => {setAnchor(new Date());setSelectedDay(null);}}>Hoje</button>
          </div>
        </div>
        <p className="pm-professional-agenda-help">Selecione um dia para filtrar as aulas. A consulta não altera os agendamentos.</p>
        {loading ? <div className="pm-schedule-message" role="status">Carregando aulas…</div>
          : error ? <div className="pm-schedule-message" role="alert"><p>{error}</p><button type="button" onClick={() => setRevision(value => value+1)}><RefreshCw size={16}/>Tentar novamente</button></div>
          : <>
          <div className="pm-professional-agenda-stats">
            <div><span>Aulas no período</span><strong>{data?.appointments.filter(item => item.status !== 'cancelado').length || 0}</strong></div>
            <div><span>Próximas no período</span><strong>{upcoming}</strong></div>
            <div><span>Canceladas</span><strong>{data?.appointments.filter(item => item.status === 'cancelado').length || 0}</strong></div>
          </div>
          <div className="pm-professional-days" aria-label="Dias do período">
            {DAYS.map(day => <span key={day} className="pm-professional-day-label">{day}</span>)}
            {mode === 'mes' && Array.from({length:dates[0].getDay()},(_,index) => <span key={`empty-${index}`} aria-hidden="true"/>)}
            {dates.map(date => {
              const key=agendaDateKey(date), count=classes.filter(item => item.date === key).length;
              return <button type="button" key={key} aria-pressed={selectedDay === key} aria-label={`${date.toLocaleDateString('pt-BR')}: ${count} aula(s)`} aria-current={key === data?.today ? 'date' : undefined} data-today={key === data?.today || undefined} data-has-classes={count>0 || undefined} onClick={() => setSelectedDay(value => value === key ? null : key)}><strong>{date.getDate()}</strong><small>{count ? `${count} aula${count === 1 ? '' : 's'}` : '—'}</small></button>;
            })}
          </div>
          <div className="pm-professional-agenda-options">
            <button type="button" onClick={() => setSelectedDay(null)} aria-pressed={!selectedDay}>Todos os dias</button>
            <label><input type="checkbox" checked={showCanceled} onChange={event => setShowCanceled(event.target.checked)}/>Incluir cancelados</label>
          </div>
          {selectedDay && <p className="pm-professional-selected-day">{new Date(`${selectedDay}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</p>}
          {visible.length === 0 ? <div className="pm-schedule-message"><CalendarDays aria-hidden="true"/><strong>Nenhuma aula neste período</strong><p>Confira outro dia ou use as setas para mudar o período.</p></div> : <div className="pm-professional-classes">
            {grouped.map(day => <section key={day}><h3>{new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</h3>{visible.filter(item => item.date === day).map(item => <article key={item.id} style={{borderLeftColor:STATUS[item.status].color}}><div className="pm-professional-class-time"><Clock size={15} aria-hidden="true"/><strong>{item.startTime}–{item.endTime}</strong></div><div className="pm-professional-class-person"><strong>{item.studentName}</strong><span><MapPin size={13} aria-hidden="true"/>{item.room || 'Sala não informada'}{item.tipoAula === 'experimental' && ' · Experimental'}</span></div><span className="pm-professional-class-status" style={{color:STATUS[item.status].color}}>{STATUS[item.status].label}</span></article>)}</section>)}
          </div>}
          {Boolean(data?.undatedCount) && <p className="pm-professional-agenda-help">Existem registros antigos sem data definida. Eles não aparecem no calendário.</p>}
        </>}
      </div>
      <footer className="pm-panel-footer"><span>Consulta integrada à agenda do estúdio</span><button type="button" onClick={onClose}>Fechar</button></footer>
    </div>
  </div>;
}

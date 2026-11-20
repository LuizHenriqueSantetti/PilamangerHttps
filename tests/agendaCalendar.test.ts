import {describe,it,expect} from 'vitest';
import {agendaDateKey,agendaWeekDates,agendaWeekLabel,shiftAgendaWeek,startOfAgendaWeek} from '../src/app/utils/agendaCalendar';

describe('agenda week navigation', () => {
  it('labels the same Sunday shown in the first column, not Monday', () => {
    const start=startOfAgendaWeek(new Date(2026,9,22,23));
    expect(agendaWeekDates(start).map(agendaDateKey)).toEqual(['2026-10-18','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24']);
    expect(agendaWeekLabel(start)).toContain('18');
    expect(agendaWeekLabel(start)).toContain('24');
  });
  it('moves exactly one week and returns without mutating the original', () => {
    const start=startOfAgendaWeek(new Date(2026,9,22));
    expect(agendaDateKey(shiftAgendaWeek(start,1))).toBe('2026-10-25');
    expect(agendaDateKey(shiftAgendaWeek(start,-1))).toBe('2026-10-11');
    expect(agendaDateKey(start)).toBe('2026-10-18');
    expect(agendaDateKey(shiftAgendaWeek(shiftAgendaWeek(start,1),-1))).toBe('2026-10-18');
  });
  it('handles a week spanning a year boundary', () => {
    const start=startOfAgendaWeek(new Date(2027,0,1));
    expect(agendaDateKey(start)).toBe('2026-12-27');
    expect(agendaDateKey(agendaWeekDates(start)[6])).toBe('2027-01-02');
    expect(agendaWeekLabel(start)).toContain('2026');
    expect(agendaWeekLabel(start)).toContain('2027');
  });
});

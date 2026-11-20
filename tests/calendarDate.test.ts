import {describe,it,expect} from 'vitest';
import {formatCalendarDate} from '../src/app/utils/calendarDate';
describe('calendar dates',()=>{
 it('preserves the civil day instead of interpreting it as UTC',()=>expect(formatCalendarDate('2026-10-16')).toBe('16/10/2026'));
 it('handles invalid values without displaying Invalid Date',()=>expect(formatCalendarDate('not-a-date')).toBe('—'));
});

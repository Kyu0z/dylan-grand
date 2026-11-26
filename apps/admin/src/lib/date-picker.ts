/** Date-only values remain calendar dates; datetime-local values are hotel wall time. */
export function hotelNow(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match)
    return null;
  const [, year, month, day] = match;
  const result = new Date(Number(year), Number(month) - 1, Number(day), 12);
  return calendarIso(result) === value ? result : null;
}
export function calendarIso(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validPickerValue(value: string, withTime: boolean): boolean {
  if (!withTime)
    return parseCalendarDate(value) !== null;
  return /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) && parseCalendarDate(value.slice(0, 10)) !== null;
}
export function displayPickerValue(value: string, withTime: boolean): string {
  if (!validPickerValue(value, withTime))
    return '';
  const date = `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
  return withTime ? `${date} · ${value.slice(11, 16)}` : date;
}
export function pickerValueInRange(value: string, min?: string, max?: string): boolean {
  return (!min || value >= min) && (!max || value <= max);
}
export function calendarCells(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
}
export function popupPosition(anchor: {
  left: number;
  top: number;
  bottom: number;
}, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const gap = 8;
  const padding = 12;
  const below = viewportHeight - anchor.bottom - gap - padding;
  const above = anchor.top - gap - padding;
  const top = below >= height || below >= above ? anchor.bottom + gap : anchor.top - gap - height;
  return {
    left: Math.max(padding, Math.min(anchor.left, viewportWidth - width - padding)),
    top: Math.max(padding, Math.min(top, viewportHeight - height - padding)),
  };
}
/** First legal end value for exclusive date or datetime ranges. */
export function nextPickerValue(value: string, withTime: boolean): string | undefined {
  if (!validPickerValue(value, withTime))
    return undefined;
  const utc = new Date(`${value}${withTime ? ':00Z' : 'T00:00:00Z'}`);
  utc.setUTCMinutes(utc.getUTCMinutes() + (withTime ? 1 : 1440));
  return utc.toISOString().slice(0, withTime ? 16 : 10);
}

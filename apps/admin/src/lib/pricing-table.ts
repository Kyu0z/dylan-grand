type RateRow = Record<string, unknown>;

const record = (value: unknown): RateRow => value && typeof value === 'object' && !Array.isArray(value) ? value as RateRow : {};
const text = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** Present legacy standalone daily overrides as one-day rows without mutating stored prices. */
export function mergePricingRates(special: RateRow[], daily: RateRow[], roomTypes: RateRow[]): RateRow[] {
  const legacy = daily.filter(r => !r.periodId).map(r => {
    const related = record(r.roomType);
    const room = roomTypes.find(t => text(t.code) === text(related.code)) ?? related;
    return { ...r, legacyDaily: true, name: '', startDate: r.date, endDate: r.date, dailyRates: [{ roomType: room }] } as RateRow;
  });
  return [...special, ...legacy].sort((a, b) => text(a.startDate).localeCompare(text(b.startDate)));
}

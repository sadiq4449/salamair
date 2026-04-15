/** Local calendar date as YYYY-MM-DD (for API query params). */
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'custom';

export function rangeFromPreset(preset: Exclude<DatePreset, 'custom'>): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      break;
    case 'week':
      from.setDate(from.getDate() - 6);
      break;
    case 'month':
      from.setDate(from.getDate() - 29);
      break;
    case 'quarter':
      from.setMonth(from.getMonth() - 3);
      break;
    default:
      break;
  }
  return { from, to };
}

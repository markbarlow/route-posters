const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Formats the ISO local start time without going through Date's timezone conversion — the
 * string already *is* local to where the activity happened, so parsing it as UTC and
 * re-rendering it in the viewer's zone would shift an early-morning run onto the previous day.
 */
function parts(iso: string | null): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export type DateStyle = 'long' | 'short' | 'numeric' | 'monthYear' | 'year';

export function formatDate(iso: string | null, style: DateStyle = 'long'): string {
  const p = parts(iso);
  if (!p) return '—';
  const month = MONTHS[p.m - 1] ?? '';
  switch (style) {
    case 'short':
      return `${p.d} ${month.slice(0, 3)} ${p.y}`;
    case 'numeric':
      return `${String(p.d).padStart(2, '0')}.${String(p.m).padStart(2, '0')}.${p.y}`;
    case 'monthYear':
      return `${month} ${p.y}`;
    case 'year':
      return String(p.y);
    case 'long':
    default:
      return `${p.d} ${month} ${p.y}`;
  }
}

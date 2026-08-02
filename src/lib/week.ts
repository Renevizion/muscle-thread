/**
 * Week helpers.
 *
 * IMPORTANT: `getDay()` returns 0 for Sunday. The naive
 * `date - getDay() + 1` formula lands on *next* Monday on Sundays,
 * which silently wiped weekly progress every Sunday. Always use
 * these helpers instead.
 */

/** Monday (00:00 local) of the week containing `from`. Sunday belongs to the week that just ended. */
export function mondayOf(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - offset);
  return d;
}

/** yyyy-mm-dd of this week's Monday (local time, not UTC-shifted). */
export function currentWeekStart(from: Date = new Date()): string {
  const d = mondayOf(from);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

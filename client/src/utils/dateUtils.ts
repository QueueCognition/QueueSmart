import { format, getDaysInMonth, startOfMonth } from "date-fns";

/** Local-calendar date key in `yyyy-MM-dd`, matching the value stored on entries. */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}

export function formatMonthName(date: Date): string {
  return format(date, "MMMM");
}

/**
 * Day numbers for a month grid, padded with `null` so that every row holds a
 * full week starting on Sunday.
 */
export function buildMonthGrid(month: Date): (number | null)[] {
  const firstWeekday = startOfMonth(month).getDay();
  const days = [
    ...Array<number | null>(firstWeekday).fill(null),
    ...Array.from({ length: getDaysInMonth(month) }, (_, index) => index + 1),
  ];

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

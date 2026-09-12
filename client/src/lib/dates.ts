import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromISO(iso: string): Date {
  const d = parseISO(iso);
  return isValid(d) ? d : new Date();
}

export function todayISO(): string {
  return toISO(new Date());
}

export function rangeDates(startISO: string, endISO: string): Date[] {
  const start = fromISO(startISO);
  const end = fromISO(endISO);
  if (start > end) return [];
  return eachDayOfInterval({ start, end });
}

export function weekRange(anchor: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(anchor, { weekStartsOn: 0 }),
    end: endOfWeek(anchor, { weekStartsOn: 0 }),
  };
}

export function formatLong(date: Date): string {
  return format(date, "EEEE, MMM d");
}

export function formatShort(date: Date): string {
  return format(date, "EEE M/d");
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}

/** Full weeks (Sun–Sat) covering the month `anchor` falls in, including the
 * leading/trailing days from adjacent months needed to complete each row. */
export function monthGridDays(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

/** "Today" / "Tomorrow" / short date, for compact due-date labels. */
export function relativeDateLabel(iso: string): string {
  const today = todayISO();
  const tomorrow = toISO(addDays(new Date(), 1));
  if (iso === today) return "Today";
  if (iso === tomorrow) return "Tomorrow";
  return formatShort(fromISO(iso));
}

export { addDays, addMonths, format, isSameMonth };

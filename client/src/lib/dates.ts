import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isValid,
  parseISO,
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

export { addDays, format };

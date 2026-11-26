import { TIMEZONE } from './constants';

export function zonedDateKey(date: Date, timeZone: string = TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export type DeadlineBucket = 'overdue' | 'today' | 'three' | 'seven' | 'later' | 'none' | 'completed';

export function classifyDeadline(
  dueDate: string | null,
  status: string,
  todayKey: string,
  terminalStatuses: ReadonlySet<string>,
): DeadlineBucket {
  if (terminalStatuses.has(status)) return 'completed';
  if (!dueDate) return 'none';
  const days = daysBetweenKeys(todayKey, dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 3) return 'three';
  if (days <= 7) return 'seven';
  return 'later';
}

export function deadlineLabel(dueDate: string | null, todayKey: string, status: string, terminal: ReadonlySet<string>): string {
  const bucket = classifyDeadline(dueDate, status, todayKey, terminal);
  if (bucket === 'completed') return 'Completed';
  if (!dueDate || bucket === 'none') return 'No deadline';
  const days = daysBetweenKeys(todayKey, dueDate);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatTimestamp(iso: string, timeZone: string = TIMEZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTodayLong(date: Date, timeZone: string = TIMEZONE): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function weekStartKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

export function monthMatrix(monthKey: string): { date: string; inMonth: boolean }[] {
  const [year, month] = monthKey.split('-').map(Number);
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const start = weekStartKey(first);
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = addDaysToKey(start, index);
    cells.push({ date, inMonth: date.slice(0, 7) === monthKey });
  }
  return cells;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1 + delta, 1));
  return utc.toISOString().slice(0, 7);
}

export function currentMonthKey(now: Date, timeZone: string = TIMEZONE): string {
  return zonedDateKey(now, timeZone).slice(0, 7);
}

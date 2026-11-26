import { TERMINAL_STATUSES } from '@shared/constants';
import { classifyDeadline, daysBetweenKeys, formatDateKey, zonedDateKey } from '@shared/dates';

export function humanStatus(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function todayKey(): string {
  return zonedDateKey(new Date());
}

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateKey(iso.slice(0, 10));
}

export function dueLabel(dueDate: string | null | undefined, status: string): string {
  if (!dueDate) return 'No due date';
  if (TERMINAL_STATUSES.has(status)) return 'Complete';
  const days = daysBetweenKeys(todayKey(), dueDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `In ${days} days`;
}

export function dueTone(dueDate: string | null | undefined, status: string): 'calm' | 'watch' | 'urgent' | 'done' {
  if (TERMINAL_STATUSES.has(status)) return 'done';
  if (!dueDate) return 'calm';
  const bucket = classifyDeadline(dueDate, status, todayKey(), TERMINAL_STATUSES);
  if (bucket === 'overdue' || bucket === 'today') return 'urgent';
  if (bucket === 'three') return 'watch';
  return 'calm';
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

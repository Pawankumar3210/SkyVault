import { describe, expect, it } from 'vitest';
import { checklistStats, progressFromTasks } from '../../src/shared/analytics';
import { classifyDeadline, daysBetweenKeys, formatDateKey } from '../../src/shared/dates';
import { inspectFile } from '../../src/shared/files';
import type { Task } from '../../src/shared/types';

describe('deadline calculations', () => {
  const terminal = new Set(['completed', 'submitted']);
  it('classifies overdue, today, upcoming, and completed work', () => {
    expect(classifyDeadline('2026-11-24', 'in_progress', '2026-11-25', terminal)).toBe('overdue');
    expect(classifyDeadline('2026-11-25', 'in_progress', '2026-11-25', terminal)).toBe('today');
    expect(classifyDeadline('2026-11-28', 'in_progress', '2026-11-25', terminal)).toBe('three');
    expect(classifyDeadline('2026-11-25', 'completed', '2026-11-25', terminal)).toBe('completed');
  });
  it('uses date keys without local timezone drift', () => {
    expect(daysBetweenKeys('2026-11-25', '2026-11-28')).toBe(3);
    expect(formatDateKey('2026-11-25')).toContain('25');
  });
});

describe('academic progress helpers', () => {
  it('calculates checklist totals and percentage', () => {
    expect(checklistStats([{ done: true }, { done: false }, { done: true }])).toEqual({ total: 3, completed: 2, remaining: 1, percentage: 67 });
    expect(checklistStats([]).percentage).toBe(0);
  });
  it('calculates progress from active tasks only', () => {
    const tasks = [
      { status: 'done', isDeleted: false },
      { status: 'todo', isDeleted: false },
      { status: 'todo', isDeleted: true },
    ] as Task[];
    expect(progressFromTasks(tasks)).toBe(50);
    expect(progressFromTasks([])).toBeNull();
  });
});

describe('upload validation', () => {
  it('accepts a correctly signed PDF and rejects mismatched content', () => {
    expect(inspectFile('brief.pdf', 'application/pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), 5, 1024).ok).toBe(true);
    expect(inspectFile('brief.pdf', 'application/pdf', new Uint8Array([0x4d, 0x5a, 0, 0]), 4, 1024).ok).toBe(false);
  });
  it('rejects executable types and files over the cap', () => {
    expect(inspectFile('unsafe.exe', '', new Uint8Array([0]), 1, 1024).ok).toBe(false);
    expect(inspectFile('large.txt', 'text/plain', new Uint8Array([0x41]), 2048, 1024).ok).toBe(false);
  });
});

import { TERMINAL_STATUSES } from './constants';
import { classifyDeadline, weekStartKey, zonedDateKey } from './dates';
import type {
  AnalyticsSummary,
  Checklist,
  DocumentCategory,
  DocumentRecord,
  DocumentVersion,
  Insight,
  Priority,
  Task,
  WorkspaceSettings,
  WorkspaceSnapshot,
  WorkItem,
} from './types';

export function checklistStats(items: { done: boolean }[]): {
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
} {
  const total = items.length;
  const completed = items.filter((item) => item.done).length;
  return {
    total,
    completed,
    remaining: total - completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function readinessLabel(percentage: number, total: number): string {
  if (total === 0) return 'No checklist yet';
  if (percentage === 100) return 'Checklist complete';
  if (percentage >= 70) return 'Nearly ready';
  if (percentage >= 40) return 'In progress';
  return 'Needs attention';
}

export function progressFromTasks(tasks: Task[]): number | null {
  const active = tasks.filter((task) => !task.isDeleted);
  if (active.length === 0) return null;
  const done = active.filter((task) => task.status === 'done').length;
  return Math.round((done / active.length) * 100);
}

export function isOpenWork(item: WorkItem): boolean {
  return !item.isDeleted && !item.isArchived && !TERMINAL_STATUSES.has(item.status);
}

export function activeWork(items: WorkItem[]): WorkItem[] {
  return items.filter((item) => !item.isDeleted && !item.isArchived);
}

export function buildInsights(input: {
  workItems: WorkItem[];
  tasks: Task[];
  todayKey: string;
}): Insight[] {
  const openItems = input.workItems.filter(isOpenWork);
  const soon = openItems.filter((item) => {
    const bucket = classifyDeadline(item.dueDate, item.status, input.todayKey, TERMINAL_STATUSES);
    return bucket === 'today' || bucket === 'three';
  });
  const insights: Insight[] = [];
  if (soon.length >= 3) {
    const incomplete = soon.filter((item) => item.progress < 100).length;
    insights.push({
      id: 'cluster',
      level: 'attention',
      title: `${soon.length} submissions sit within the next three days`,
      detail: `${incomplete} of them still have incomplete progress or unfinished checklist work.`,
    });
  }
  const stalled = openItems.filter((item) => {
    const bucket = classifyDeadline(item.dueDate, item.status, input.todayKey, TERMINAL_STATUSES);
    const urgentWindow = bucket === 'today' || bucket === 'three' || bucket === 'seven' || bucket === 'overdue';
    return urgentWindow && (item.priority === 'high' || item.priority === 'critical') && item.progress < 40;
  });
  if (stalled.length > 0) {
    insights.push({
      id: 'stalled',
      level: 'watch',
      title: `${stalled.length} high-priority item${stalled.length === 1 ? '' : 's'} have little recorded progress`,
      detail: stalled
        .slice(0, 3)
        .map((item) => item.title)
        .join(', '),
    });
  }
  const openTasks = input.tasks.filter((task) => !task.isDeleted && task.status !== 'done');
  const lateTasks = openTasks.filter((task) => {
    if (!task.dueDate) return false;
    return classifyDeadline(task.dueDate, 'in_progress', input.todayKey, TERMINAL_STATUSES) !== 'later'
      && classifyDeadline(task.dueDate, 'in_progress', input.todayKey, TERMINAL_STATUSES) !== 'none'
      && (task.dueDate <= input.todayKey || classifyDeadline(task.dueDate, 'in_progress', input.todayKey, TERMINAL_STATUSES) === 'three' || task.dueDate === input.todayKey);
  });
  const dueSoonTasks = openTasks.filter((task) => task.dueDate && task.dueDate <= addSafe(input.todayKey, 3));
  if (dueSoonTasks.length > 0) {
    insights.push({
      id: 'tasks',
      level: dueSoonTasks.some((task) => task.dueDate && task.dueDate < input.todayKey) ? 'attention' : 'watch',
      title: `${dueSoonTasks.length} open task${dueSoonTasks.length === 1 ? '' : 's'} are due soon or overdue`,
      detail: 'These are assigned tasks, not a verified measure of who did the work.',
    });
  }
  const byMember = new Map<string, number>();
  for (const task of openTasks) {
    if (!task.assignedMemberId) continue;
    byMember.set(task.assignedMemberId, (byMember.get(task.assignedMemberId) ?? 0) + 1);
  }
  const loads = [...byMember.values()];
  if (loads.length >= 2) {
    const average = loads.reduce((sum, value) => sum + value, 0) / loads.length;
    const heavy = [...byMember.entries()].filter(([, count]) => count >= 4 && count >= average + 2);
    if (heavy.length > 0) {
      insights.push({
        id: 'load',
        level: 'info',
        title: `${heavy.length} teammate${heavy.length === 1 ? '' : 's'} have a higher assigned task count`,
        detail: 'This compares open assignments only. It does not verify individual contribution.',
      });
    }
  }
  if (insights.length === 0) {
    insights.push({
      id: 'clear',
      level: 'info',
      title: 'No clustered deadline risk is visible',
      detail: 'Upcoming work is spread out, or there are no open dated items in the current filter.',
    });
  }
  void lateTasks;
  return insights;
}

function addSafe(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function storageSummary(
  documents: DocumentRecord[],
  versions: DocumentVersion[],
  settings: WorkspaceSettings,
): AnalyticsSummary['storage'] {
  const visible = documents.filter((document) => document.status === 'ready');
  const byCategory = new Map<DocumentCategory, { count: number; bytes: number }>();
  let currentBytes = 0;
  for (const document of visible) {
    currentBytes += document.sizeBytes;
    const entry = byCategory.get(document.category) ?? { count: 0, bytes: 0 };
    entry.count += 1;
    entry.bytes += document.sizeBytes;
    byCategory.set(document.category, entry);
  }
  const versionBytes = versions.reduce((sum, version) => sum + version.sizeBytes, 0);
  const softLimitBytes = settings.storageSoftLimitMb * 1024 * 1024;
  return {
    fileCount: visible.length,
    totalBytes: currentBytes + versionBytes,
    softLimitBytes,
    warningBytes: Math.round(softLimitBytes * (settings.uploadWarningPercentage / 100)),
    byCategory: [...byCategory.entries()].map(([category, value]) => ({ category, ...value })),
  };
}

export function buildAnalytics(snapshot: WorkspaceSnapshot, now: Date, filters?: { subjectId?: string; from?: string; to?: string }): AnalyticsSummary {
  const todayKey = zonedDateKey(now, snapshot.settings.timezone);
  const subjectFilter = filters?.subjectId;
  const inRange = (item: { createdAt: string; dueDate?: string | null }) => {
    if (!filters?.from && !filters?.to) return true;
    const createdKey = zonedDateKey(new Date(item.createdAt));
    const keys = [createdKey, item.dueDate].filter(Boolean) as string[];
    return keys.some((key) => (!filters.from || key >= filters.from) && (!filters.to || key <= filters.to));
  };
  const workItems = snapshot.workItems.filter((item) => !item.isDeleted && (!subjectFilter || item.subjectId === subjectFilter) && inRange(item));
  const workIds = new Set(workItems.map((item) => item.id));
  const tasks = snapshot.tasks.filter((task) => !task.isDeleted && (!subjectFilter || workIds.has(task.workItemId)));
  const subjects = snapshot.subjects.filter((subject) => !subject.isDeleted);
  const live = workItems.filter((item) => !item.isArchived);
  const countBucket = (bucket: 'today' | 'three' | 'seven' | 'overdue' | 'completed') =>
    live.filter((item) => classifyDeadline(item.dueDate, item.status, todayKey, TERMINAL_STATUSES) === bucket).length;

  const workloadBySubject = subjects
    .filter((subject) => !subjectFilter || subject.id === subjectFilter)
    .map((subject) => {
      const own = live.filter((item) => item.subjectId === subject.id);
      const done = own.filter((item) => TERMINAL_STATUSES.has(item.status)).length;
      return {
        subjectId: subject.id,
        name: subject.name,
        code: subject.code,
        color: subject.color,
        projects: own.filter((item) => item.type === 'project').length,
        assignments: own.filter((item) => item.type === 'assignment').length,
        labs: own.filter((item) => item.type === 'lab').length,
        total: own.length,
        progress: own.length === 0 ? 0 : Math.round((done / own.length) * 100),
      };
    })
    .filter((row) => !subjectFilter || row.subjectId === subjectFilter);

  const statusIds = snapshot.settings.statuses.map((status) => status.id);
  const statusDistribution = statusIds.map((status) => ({
    status,
    label: snapshot.settings.statuses.find((option) => option.id === status)?.label ?? status,
    count: live.filter((item) => item.status === status).length,
  }));

  const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];
  const priorityDistribution = priorities.map((priority) => ({
    priority,
    count: live.filter((item) => item.priority === priority).length,
  }));

  const completionTrend = lastWeeks(todayKey, 8).map((week) => ({
    week,
    completed: live.filter((item) => item.completedAt && weekStartKey(zonedDateKey(new Date(item.completedAt))) === week).length,
    created: live.filter((item) => weekStartKey(zonedDateKey(new Date(item.createdAt))) === week).length,
  }));

  const deadlinesByWeek = lastWeeks(todayKey, 8).map((week) => ({
    week,
    count: live.filter((item) => item.dueDate && weekStartKey(item.dueDate) === week && !TERMINAL_STATUSES.has(item.status)).length,
  }));

  const members = snapshot.members.filter((member) => !member.isDeleted);
  const tasksByMember = members.map((member) => {
    const assigned = tasks.filter((task) => task.assignedMemberId === member.id);
    const overdue = assigned.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < todayKey).length;
    const completed = assigned.filter((task) => task.status === 'done').length;
    return {
      memberId: member.id,
      name: member.name,
      assigned: assigned.length,
      completed,
      pending: assigned.length - completed,
      overdue,
    };
  });

  const projects = live.filter((item) => item.type === 'project');
  const assignments = live.filter((item) => item.type === 'assignment');
  const labs = live.filter((item) => item.type === 'lab');
  const completedWork = live.filter((item) => item.status === 'completed').length;
  const terminal = live.filter((item) => TERMINAL_STATUSES.has(item.status)).length;

  return {
    activeProjects: projects.filter((item) => !TERMINAL_STATUSES.has(item.status)).length,
    pendingAssignments: assignments.filter((item) => !TERMINAL_STATUSES.has(item.status)).length,
    activeLabs: labs.filter((item) => !TERMINAL_STATUSES.has(item.status)).length,
    upcomingDeadlines: live.filter((item) => {
      const bucket = classifyDeadline(item.dueDate, item.status, todayKey, TERMINAL_STATUSES);
      return bucket === 'today' || bucket === 'three' || bucket === 'seven';
    }).length,
    completedWork,
    overdueItems: countBucket('overdue'),
    totalProjects: projects.length,
    completedProjects: projects.filter((item) => item.status === 'completed').length,
    inProgressProjects: projects.filter((item) => item.status === 'in_progress' || item.status === 'under_review').length,
    completedAssignments: assignments.filter((item) => TERMINAL_STATUSES.has(item.status)).length,
    submissionCompletionRate: live.length === 0 ? 0 : Math.round((terminal / live.length) * 100),
    radar: {
      today: countBucket('today'),
      three: countBucket('three'),
      seven: countBucket('seven'),
      overdue: countBucket('overdue'),
      completed: live.filter((item) => TERMINAL_STATUSES.has(item.status)).length,
    },
    workloadBySubject,
    statusDistribution,
    priorityDistribution,
    completionTrend,
    tasksByMember,
    deadlinesByWeek,
    insights: buildInsights({ workItems: live, tasks, todayKey }),
    storage: storageSummary(
      snapshot.documents.filter((document) => !subjectFilter || document.subjectId === subjectFilter),
      snapshot.versions,
      snapshot.settings,
    ),
  };
}

function lastWeeks(todayKey: string, count: number): string[] {
  const start = weekStartKey(todayKey);
  const weeks: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    weeks.push(addSafe(start, -7 * index));
  }
  return weeks;
}

export function checklistReadiness(checklists: Checklist[], workItemId: string): { percentage: number; total: number; completed: number; remaining: number } {
  const items = checklists.filter((list) => list.workItemId === workItemId && !list.isDeleted).flatMap((list) => list.items);
  return checklistStats(items);
}

import type { Activity, ActivityEvent, ActorContext, SearchHit, WorkspaceExport, WorkspaceSnapshot } from './types';

export function createId(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value.replace(/-/g, '').slice(0, 20)}`;
}

export function actorFrom(input: ActorContext | undefined, memberName?: string | null): { actorMemberId: string | null; actorDisplayName: string } {
  if (memberName) {
    return { actorMemberId: input?.memberId ?? null, actorDisplayName: memberName };
  }
  const displayName = input?.displayName?.trim();
  return {
    actorMemberId: input?.memberId ?? null,
    actorDisplayName: displayName || 'Unassigned actor',
  };
}

export function makeActivity(input: {
  eventType: ActivityEvent;
  description: string;
  actor: ActorContext | undefined;
  actorName?: string | null;
  relatedEntityType: string;
  relatedEntityId: string;
  relatedSubjectId?: string | null;
  metadata?: Activity['metadata'];
  now?: string;
}): Activity {
  const actor = actorFrom(input.actor, input.actorName);
  return {
    id: createId('act'),
    eventType: input.eventType,
    description: input.description,
    actorMemberId: actor.actorMemberId,
    actorDisplayName: actor.actorDisplayName,
    identityVerified: false,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    relatedSubjectId: input.relatedSubjectId ?? null,
    metadata: input.metadata ?? {},
    createdAt: input.now ?? new Date().toISOString(),
  };
}

export function searchWorkspace(snapshot: WorkspaceSnapshot, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const hits: SearchHit[] = [];
  const has = (...parts: Array<string | null | undefined>) => parts.some((part) => part?.toLowerCase().includes(q));
  for (const subject of snapshot.subjects.filter((item) => !item.isDeleted)) {
    if (has(subject.name, subject.code, subject.description)) {
      hits.push({ id: subject.id, type: 'subject', title: subject.name, subtitle: subject.code, href: `/subjects/${subject.id}` });
    }
  }
  for (const item of snapshot.workItems.filter((entry) => !entry.isDeleted)) {
    if (has(item.title, item.description, item.category, item.tags.join(' '))) {
      const type = item.type === 'project' ? 'project' : item.type;
      hits.push({
        id: item.id,
        type,
        title: item.title,
        subtitle: item.type,
        href: item.type === 'project' ? `/projects/${item.id}` : `/work/${item.id}`,
      });
    }
  }
  for (const member of snapshot.members.filter((entry) => !entry.isDeleted)) {
    if (has(member.name, member.email, member.academicRole, member.skills.join(' '))) {
      hits.push({ id: member.id, type: 'member', title: member.name, subtitle: member.academicRole || 'Teammate', href: `/team/${member.id}` });
    }
  }
  for (const task of snapshot.tasks.filter((entry) => !entry.isDeleted)) {
    if (has(task.title, task.description)) {
      hits.push({ id: task.id, type: 'task', title: task.title, subtitle: 'Task', href: `/projects/${task.workItemId}?tab=tasks` });
    }
  }
  for (const document of snapshot.documents.filter((entry) => !entry.isDeleted && entry.status === 'ready')) {
    if (has(document.displayName, document.originalName, document.tags.join(' '), document.description)) {
      hits.push({ id: document.id, type: 'document', title: document.displayName, subtitle: document.category, href: `/vault?doc=${document.id}` });
    }
  }
  for (const template of snapshot.templates.filter((entry) => !entry.isDeleted)) {
    if (has(template.name, template.description, template.source)) {
      hits.push({ id: template.id, type: 'template', title: template.name, subtitle: 'Template', href: `/templates?template=${template.id}` });
    }
  }
  return hits.slice(0, 20);
}

export function buildExport(snapshot: WorkspaceSnapshot, now = new Date().toISOString()): WorkspaceExport {
  return {
    format: 'sky-vault-workspace',
    version: 1,
    exportedAt: now,
    note: 'Structured metadata only. File bytes, signed URLs, and credentials are not included.',
    subjects: snapshot.subjects,
    workItems: snapshot.workItems,
    tasks: snapshot.tasks,
    members: snapshot.members,
    documents: snapshot.documents.map((document) => ({ ...document })),
    versions: snapshot.versions,
    templates: snapshot.templates,
    checklists: snapshot.checklists,
    activities: snapshot.activities,
    settings: snapshot.settings,
  };
}

export function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

export function pageItems<T>(items: T[], page = 1, pageSize = 12): { items: T[]; total: number; page: number; pageSize: number } {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page: safePage, pageSize };
}

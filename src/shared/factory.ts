import { createId } from './records';
import type {
  ChecklistInput,
  DocumentMetaInput,
  MemberInput,
  SubjectInput,
  TaskInput,
  TemplateInput,
  WorkItemInput,
} from './schemas';
import type { ActorContext, Checklist, DocumentRecord, Subject, Task, TeamMember, TemplateRecord, WorkItem } from './types';

export function newSubject(input: SubjectInput, now: string): Subject {
  return {
    id: createId('sub'),
    name: input.name,
    code: input.code.toUpperCase(),
    description: input.description ?? '',
    color: input.color,
    isDemo: false,
    isArchived: false,
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function newWorkItem(input: WorkItemInput, now: string): WorkItem {
  const status = input.status ?? 'not_started';
  return {
    id: createId('work'),
    title: input.title,
    type: input.type,
    projectType: input.type === 'project' ? input.projectType ?? 'group' : null,
    category: input.category ?? '',
    subjectId: input.subjectId,
    description: input.description ?? '',
    instructions: input.instructions ?? '',
    status,
    priority: input.priority ?? 'medium',
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    teamMemberIds: input.teamMemberIds ?? [],
    projectLeadId: input.projectLeadId ?? null,
    tags: input.tags ?? [],
    progress: input.progress ?? 0,
    deliverables: input.deliverables ?? [],
    submissionFormat: input.submissionFormat ?? '',
    notes: input.notes ?? '',
    labNumber: input.labNumber ?? '',
    experimentNumber: input.experimentNumber ?? '',
    objective: input.objective ?? '',
    requiredTools: input.requiredTools ?? '',
    milestones: (input.milestones ?? []).map((milestone) => ({
      id: milestone.id ?? createId('ms'),
      title: milestone.title,
      date: milestone.date,
      done: milestone.done ?? false,
    })),
    isDemo: false,
    isArchived: false,
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    completedAt: status === 'completed' || status === 'submitted' ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function newTask(input: TaskInput, now: string): Task {
  const status = input.status ?? 'todo';
  return {
    id: createId('task'),
    title: input.title,
    description: input.description ?? '',
    workItemId: input.workItemId,
    assignedMemberId: input.assignedMemberId ?? null,
    priority: input.priority ?? 'medium',
    status,
    dueDate: input.dueDate ?? null,
    completedAt: status === 'done' ? now : null,
    isDemo: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function newMember(input: MemberInput, now: string): TeamMember {
  return {
    id: createId('mem'),
    name: input.name,
    email: input.email ?? '',
    phone: input.phone ?? '',
    studentId: input.studentId ?? '',
    academicRole: input.academicRole ?? '',
    skills: input.skills ?? [],
    notes: input.notes ?? '',
    isDemo: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function newDocument(
  input: DocumentMetaInput & { id?: string; path: string; storageMode: 'indexeddb' | 'gcs'; actor: ActorContext },
  now: string,
): DocumentRecord {
  return {
    id: input.id ?? createId('doc'),
    displayName: input.displayName,
    originalName: input.originalName,
    storageObjectPath: input.path,
    storageMode: input.storageMode,
    subjectId: input.subjectId ?? null,
    workItemId: input.workItemId ?? null,
    templateId: null,
    category: input.category,
    mimeType: input.mimeType ?? 'application/octet-stream',
    sizeBytes: input.sizeBytes,
    version: 1,
    uploadedByLabel: input.actor.displayName || 'Unassigned actor',
    uploadedByMemberId: input.actor.memberId ?? null,
    tags: input.tags ?? [],
    description: input.description ?? '',
    status: 'pending',
    pendingPath: input.path,
    pendingOriginalName: input.originalName,
    pendingMimeType: input.mimeType ?? 'application/octet-stream',
    pendingSizeBytes: input.sizeBytes,
    lastAccessedAt: null,
    isDemo: input.storageMode === 'indexeddb',
    isArchived: false,
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function newTemplate(input: TemplateInput, now: string): TemplateRecord {
  return {
    id: createId('tpl'),
    name: input.name,
    subjectId: input.subjectId ?? null,
    templateCategory: input.templateCategory,
    documentId: input.documentId ?? null,
    description: input.description ?? '',
    source: input.source ?? '',
    versionLabel: input.versionLabel ?? '1',
    instructions: input.instructions ?? '',
    isOfficial: input.isOfficial ?? false,
    checklistItems: (input.checklistItems ?? []).map((item) => ({
      id: item.id ?? createId('chkitem'),
      label: item.label,
      done: item.done ?? false,
      group: item.group ?? '',
    })),
    isDemo: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function newChecklist(input: ChecklistInput, now: string): Checklist {
  return {
    id: createId('chk'),
    workItemId: input.workItemId ?? null,
    templateId: input.templateId ?? null,
    title: input.title,
    items: input.items.map((item) => ({
      id: item.id ?? createId('item'),
      label: item.label,
      done: item.done ?? false,
      group: item.group ?? '',
    })),
    isDemo: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyDefined<T extends object>(current: T, patch: Partial<T>): T {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

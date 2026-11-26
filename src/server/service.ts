import { ZodError } from 'zod';
import { buildAnalytics } from '../shared/analytics';
import { TERMINAL_STATUSES } from '../shared/constants';
import { classifyDeadline, zonedDateKey } from '../shared/dates';
import { applyDefined, newChecklist, newDocument, newMember, newSubject, newTask, newTemplate, newWorkItem } from '../shared/factory';
import { buildObjectPath, extensionOf, inspectFile } from '../shared/files';
import { progressFromTasks } from '../shared/analytics';
import { actorFrom, buildExport, createId, makeActivity, pageItems, searchWorkspace } from '../shared/records';
import {
  ActorSchema,
  ChecklistInputSchema,
  ChecklistPatchSchema,
  DocumentMetaSchema,
  MemberInputSchema,
  MemberPatchSchema,
  SettingsPatchSchema,
  SubjectInputSchema,
  SubjectPatchSchema,
  TaskInputSchema,
  TaskPatchSchema,
  TemplateInputSchema,
  TemplatePatchSchema,
  WorkItemInputSchema,
  WorkItemPatchSchema,
} from '../shared/schemas';
import { buildSemesterSeed, defaultSettings } from '../shared/seed';
import type { AppConfig } from './config';
import { ApiError } from './http';
import type { ObjectStorage } from './storage/memory';
import type { DataStore } from './store/memory';
import type {
  Activity,
  ActorContext,
  AppNotification,
  Checklist,
  DocumentRecord,
  DocumentVersion,
  Subject,
  Task,
  TeamMember,
  TemplateRecord,
  WorkItem,
  WorkspaceSettings,
  WorkspaceSnapshot,
} from '../shared/types';

const C = {
  subjects: 'subjects',
  workItems: 'workItems',
  tasks: 'tasks',
  members: 'teamMembers',
  documents: 'documents',
  versions: 'documentVersions',
  templates: 'templates',
  activities: 'activities',
  notifications: 'notifications',
  checklists: 'checklists',
  settings: 'settings',
} as const;

function parse<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      throw new ApiError(400, 'VALIDATION_ERROR', issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'Please review the submitted information.', error.issues);
    }
    throw error;
  }
}

function decodeHeader(value?: string): Uint8Array {
  if (!value) return new Uint8Array();
  return new Uint8Array(Buffer.from(value, 'base64'));
}

export class WorkspaceService {
  constructor(
    private store: DataStore,
    private objects: ObjectStorage,
    private config: AppConfig,
  ) {}

  private now() {
    return new Date().toISOString();
  }

  private async actor(input: unknown) {
    const parsed = parse(ActorSchema, input ?? {});
    const context: ActorContext = { memberId: parsed.memberId ?? null, displayName: parsed.displayName ?? '' };
    if (context.memberId) {
      const member = await this.store.get<TeamMember>(C.members, context.memberId);
      if (!member || member.isDeleted) throw new ApiError(400, 'VALIDATION_ERROR', 'Choose a current teammate.');
      return actorFrom(context, member.name);
    }
    return actorFrom(context);
  }

  private async log(activity: Activity) {
    await this.store.save(C.activities, activity);
  }

  async snapshot(): Promise<WorkspaceSnapshot> {
    const [subjects, workItems, tasks, members, documents, versions, templates, checklists, activities, notifications, settingsRow] = await Promise.all([
      this.store.list<Subject>(C.subjects),
      this.store.list<WorkItem>(C.workItems),
      this.store.list<Task>(C.tasks),
      this.store.list<TeamMember>(C.members),
      this.store.list<DocumentRecord>(C.documents),
      this.store.list<DocumentVersion>(C.versions),
      this.store.list<TemplateRecord>(C.templates),
      this.store.list<Checklist>(C.checklists),
      this.store.list<Activity>(C.activities),
      this.store.list<AppNotification>(C.notifications),
      this.store.get<WorkspaceSettings>(C.settings, 'workspace'),
    ]);
    return {
      subjects,
      workItems,
      tasks,
      members,
      documents,
      versions,
      templates,
      checklists,
      activities,
      notifications,
      settings: settingsRow ?? defaultSettings(this.now()),
    };
  }

  async settings() {
    return (await this.snapshot()).settings;
  }

  async updateSettings(input: unknown) {
    const patch = parse(SettingsPatchSchema, input);
    const current = await this.settings();
    if (patch.maxFileSizeMb && patch.maxFileSizeMb > this.config.maxFileSizeMb) {
      throw new ApiError(400, 'VALIDATION_ERROR', `The server cap is ${this.config.maxFileSizeMb} MB.`);
    }
    const next = { ...current, ...patch, id: 'workspace' as const, timezone: 'Asia/Kolkata' as const, updatedAt: this.now() };
    return this.store.save(C.settings, next);
  }

  async listSubjects() {
    return (await this.store.list<Subject>(C.subjects)).filter((subject) => !subject.isDeleted).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSubject(id: string) {
    const subject = await this.store.get<Subject>(C.subjects, id);
    if (!subject || subject.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Subject not found.');
    return subject;
  }

  async createSubject(input: unknown, actorInput: unknown) {
    const data = parse(SubjectInputSchema, input);
    const subject = newSubject(data, this.now());
    await this.store.save(C.subjects, subject);
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: 'subject_created',
      description: `Added subject ${subject.name}.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'subject',
      relatedEntityId: subject.id,
      relatedSubjectId: subject.id,
      now: this.now(),
    }));
    return subject;
  }

  async updateSubject(id: string, input: unknown) {
    const current = await this.getSubject(id);
    const patch = parse(SubjectPatchSchema, input);
    const next = applyDefined(current, { ...patch, code: patch.code?.toUpperCase(), updatedAt: this.now() });
    return this.store.save(C.subjects, next);
  }

  async deleteSubject(id: string) {
    const subject = await this.getSubject(id);
    const next = { ...subject, isDeleted: true, deletedAt: this.now(), updatedAt: this.now() };
    return this.store.save(C.subjects, next);
  }

  async restoreSubject(id: string) {
    const subject = await this.store.get<Subject>(C.subjects, id);
    if (!subject) throw new ApiError(404, 'NOT_FOUND', 'Subject not found.');
    return this.store.save(C.subjects, { ...subject, isDeleted: false, deletedAt: null, updatedAt: this.now() });
  }

  async listWorkItems(query: Record<string, string | undefined>) {
    const snap = await this.snapshot();
    const today = zonedDateKey(new Date(), snap.settings.timezone);
    let items = snap.workItems.filter((item) => (query.deleted === 'true' ? item.isDeleted : !item.isDeleted));
    if (query.archived === 'true') items = items.filter((item) => item.isArchived || TERMINAL_STATUSES.has(item.status));
    else if (query.archived !== 'all') items = items.filter((item) => !item.isArchived);
    if (query.type) items = items.filter((item) => item.type === query.type);
    if (query.subjectId) items = items.filter((item) => item.subjectId === query.subjectId);
    if (query.status) items = items.filter((item) => item.status === query.status);
    if (query.priority) items = items.filter((item) => item.priority === query.priority);
    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter((item) => `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(q));
    }
    if (query.pending === '1') items = items.filter((item) => !TERMINAL_STATUSES.has(item.status));
    if (query.active === '1') items = items.filter((item) => item.type === 'project' && !TERMINAL_STATUSES.has(item.status));
    if (query.due) {
      items = items.filter((item) => {
        const bucket = classifyDeadline(item.dueDate, item.status, today, TERMINAL_STATUSES);
        if (query.due === 'today') return bucket === 'today';
        if (query.due === 'three') return bucket === 'three';
        if (query.due === 'seven') return bucket === 'seven' || bucket === 'three' || bucket === 'today';
        if (query.due === 'overdue') return bucket === 'overdue';
        if (query.due === 'completed') return bucket === 'completed';
        return true;
      });
    }
    items.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.updatedAt.localeCompare(a.updatedAt));
    return pageItems(items, Number(query.page ?? 1), Number(query.pageSize ?? 50));
  }

  async getWorkItem(id: string) {
    const item = await this.store.get<WorkItem>(C.workItems, id);
    if (!item || item.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Academic work not found.');
    return item;
  }

  async createWorkItem(input: unknown, actorInput: unknown) {
    const data = parse(WorkItemInputSchema, input);
    await this.getSubject(data.subjectId);
    await this.assertMembers(data.teamMemberIds ?? [], data.projectLeadId ?? null);
    const item = newWorkItem(data, this.now());
    await this.store.save(C.workItems, item);
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: item.type === 'project' ? 'project_created' : 'project_created',
      description: `Created ${item.type} “${item.title}”.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'work_item',
      relatedEntityId: item.id,
      relatedSubjectId: item.subjectId,
      now: this.now(),
    }));
    return item;
  }

  async updateWorkItem(id: string, input: unknown, actorInput: unknown) {
    const current = await this.getWorkItem(id);
    const patch = parse(WorkItemPatchSchema, input);
    if (patch.subjectId) await this.getSubject(patch.subjectId);
    if (patch.teamMemberIds || patch.projectLeadId) await this.assertMembers(patch.teamMemberIds ?? current.teamMemberIds, patch.projectLeadId === undefined ? current.projectLeadId : patch.projectLeadId);
    const next = applyDefined<WorkItem>(current, { ...patch, updatedAt: this.now() } as Partial<WorkItem>);
    if (patch.milestones) {
      next.milestones = patch.milestones.map((milestone) => ({
        id: milestone.id ?? createId('ms'),
        title: milestone.title,
        date: milestone.date,
        done: milestone.done ?? false,
      }));
    }
    if (patch.status && (patch.status === 'completed' || patch.status === 'submitted') && !next.completedAt) next.completedAt = this.now();
    if (patch.status && patch.status !== 'completed' && patch.status !== 'submitted') next.completedAt = null;
    await this.store.save(C.workItems, next);
    const actor = await this.actor(actorInput);
    const base = { actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName }, actorName: actor.actorDisplayName, relatedEntityType: 'work_item', relatedEntityId: id, relatedSubjectId: next.subjectId, now: this.now() };
    if (patch.status && patch.status !== current.status) {
      await this.log(makeActivity({
        ...base,
        eventType: patch.status === 'submitted' ? 'assignment_submitted' : 'status_updated',
        description: `Updated “${next.title}” to ${patch.status.replaceAll('_', ' ')}.`,
      }));
    } else if (patch.dueDate && patch.dueDate !== current.dueDate) {
      await this.log(makeActivity({ ...base, eventType: 'deadline_changed', description: `Changed the deadline for “${next.title}”.` }));
    } else {
      await this.log(makeActivity({ ...base, eventType: 'project_edited', description: `Edited “${next.title}”.` }));
    }
    return next;
  }

  async deleteWorkItem(id: string) {
    const item = await this.getWorkItem(id);
    return this.store.save(C.workItems, { ...item, isDeleted: true, deletedAt: this.now(), updatedAt: this.now() });
  }

  async restoreWorkItem(id: string) {
    const item = await this.store.get<WorkItem>(C.workItems, id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Academic work not found.');
    return this.store.save(C.workItems, { ...item, isDeleted: false, deletedAt: null, isArchived: false, archivedAt: null, updatedAt: this.now() });
  }

  async listTasks(workItemId?: string) {
    const tasks = (await this.store.list<Task>(C.tasks)).filter((task) => !task.isDeleted && (!workItemId || task.workItemId === workItemId));
    return tasks.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  }

  async createTask(input: unknown, actorInput: unknown) {
    const data = parse(TaskInputSchema, input);
    const work = await this.getWorkItem(data.workItemId);
    if (data.assignedMemberId) await this.assertMembers([data.assignedMemberId], null);
    const task = newTask(data, this.now());
    await this.store.save(C.tasks, task);
    await this.recalculateProgress(work.id);
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: data.assignedMemberId ? 'task_assigned' : 'task_created',
      description: `Added task “${task.title}”.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'task',
      relatedEntityId: task.id,
      relatedSubjectId: work.subjectId,
      now: this.now(),
    }));
    return task;
  }

  async updateTask(id: string, input: unknown, actorInput: unknown) {
    const current = await this.store.get<Task>(C.tasks, id);
    if (!current || current.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
    const patch = parse(TaskPatchSchema, input);
    if (patch.assignedMemberId) await this.assertMembers([patch.assignedMemberId], null);
    const next = applyDefined(current, { ...patch, updatedAt: this.now() });
    if (patch.status === 'done') next.completedAt = current.completedAt ?? this.now();
    if (patch.status && patch.status !== 'done') next.completedAt = null;
    await this.store.save(C.tasks, next);
    await this.recalculateProgress(next.workItemId);
    if (patch.status && patch.status !== current.status) {
      const work = await this.getWorkItem(next.workItemId);
      const actor = await this.actor(actorInput);
      await this.log(makeActivity({
        eventType: 'status_updated',
        description: `Updated task “${next.title}” to ${next.status.replaceAll('_', ' ')}.`,
        actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
        actorName: actor.actorDisplayName,
        relatedEntityType: 'task',
        relatedEntityId: id,
        relatedSubjectId: work.subjectId,
        now: this.now(),
      }));
    }
    return next;
  }

  async deleteTask(id: string) {
    const task = await this.store.get<Task>(C.tasks, id);
    if (!task || task.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
    const saved = await this.store.save(C.tasks, { ...task, isDeleted: true, deletedAt: this.now(), updatedAt: this.now() });
    await this.recalculateProgress(task.workItemId);
    return saved;
  }

  async listMembers() {
    return (await this.store.list<TeamMember>(C.members)).filter((member) => !member.isDeleted).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getMember(id: string) {
    const member = await this.store.get<TeamMember>(C.members, id);
    if (!member || member.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Teammate not found.');
    return member;
  }

  async createMember(input: unknown, actorInput: unknown) {
    const data = parse(MemberInputSchema, input);
    const member = newMember(data, this.now());
    await this.store.save(C.members, member);
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: 'teammate_added',
      description: `Added teammate ${member.name}.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'member',
      relatedEntityId: member.id,
      now: this.now(),
    }));
    return member;
  }

  async updateMember(id: string, input: unknown) {
    const current = await this.getMember(id);
    const patch = parse(MemberPatchSchema, input);
    return this.store.save(C.members, applyDefined(current, { ...patch, updatedAt: this.now() }));
  }

  async deleteMember(id: string, reassignTo: string | null | undefined, actorInput: unknown) {
    const member = await this.getMember(id);
    const tasks = (await this.store.list<Task>(C.tasks)).filter((task) => !task.isDeleted && task.assignedMemberId === id);
    const leading = (await this.store.list<WorkItem>(C.workItems)).filter((item) => !item.isDeleted && (item.projectLeadId === id || item.teamMemberIds.includes(id)));
    if ((tasks.length > 0 || leading.length > 0) && reassignTo === undefined) {
      throw new ApiError(409, 'REASSIGN_REQUIRED', 'This teammate still has work. Reassign it or confirm removal.');
    }
    if (reassignTo) await this.getMember(reassignTo);
    for (const task of tasks) {
      await this.store.save(C.tasks, { ...task, assignedMemberId: reassignTo ?? null, updatedAt: this.now() });
    }
    for (const item of leading) {
      await this.store.save(C.workItems, {
        ...item,
        projectLeadId: item.projectLeadId === id ? reassignTo ?? null : item.projectLeadId,
        teamMemberIds: item.teamMemberIds.filter((memberId) => memberId !== id),
        updatedAt: this.now(),
      });
    }
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: 'teammate_removed',
      description: `Removed teammate ${member.name}.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'member',
      relatedEntityId: id,
      now: this.now(),
    }));
    return this.store.save(C.members, { ...member, isDeleted: true, deletedAt: this.now(), updatedAt: this.now() });
  }

  async listDocuments(query: Record<string, string | undefined>) {
    let documents = (await this.store.list<DocumentRecord>(C.documents)).filter((document) => document.status === 'ready');
    if (query.deleted === 'true') documents = documents.filter((document) => document.isDeleted);
    else documents = documents.filter((document) => !document.isDeleted);
    if (query.archived === 'true') documents = documents.filter((document) => document.isArchived);
    else if (query.archived !== 'all') documents = documents.filter((document) => !document.isArchived);
    if (query.category) documents = documents.filter((document) => document.category === query.category);
    if (query.subjectId) documents = documents.filter((document) => document.subjectId === query.subjectId);
    if (query.workItemId) documents = documents.filter((document) => document.workItemId === query.workItemId);
    if (query.q) {
      const q = query.q.toLowerCase();
      documents = documents.filter((document) => `${document.displayName} ${document.originalName} ${document.tags.join(' ')}`.toLowerCase().includes(q));
    }
    const sort = query.sort ?? 'newest';
    documents.sort((a, b) => {
      if (sort === 'name') return a.displayName.localeCompare(b.displayName);
      if (sort === 'size') return b.sizeBytes - a.sizeBytes;
      if (sort === 'accessed') return (b.lastAccessedAt ?? '').localeCompare(a.lastAccessedAt ?? '');
      return b.createdAt.localeCompare(a.createdAt);
    });
    return pageItems(documents, Number(query.page ?? 1), Number(query.pageSize ?? 24));
  }

  async createUpload(input: unknown, actorInput: unknown) {
    const data = parse(DocumentMetaSchema, input);
    const settings = await this.settings();
    const maxBytes = Math.min(settings.maxFileSizeMb, this.config.maxFileSizeMb) * 1024 * 1024;
    const header = decodeHeader(data.headerBase64);
    const inspection = inspectFile(data.originalName, data.mimeType ?? '', header, data.sizeBytes, maxBytes);
    if (!inspection.ok || !inspection.extension) throw new ApiError(400, 'FILE_REJECTED', inspection.message);
    if (data.subjectId) await this.getSubject(data.subjectId);
    if (data.workItemId) await this.getWorkItem(data.workItemId);
    const subject = data.subjectId ? await this.store.get<Subject>(C.subjects, data.subjectId) : null;
    const actor = await this.actor(actorInput);
    const document = newDocument({
      ...data,
      mimeType: inspection.mimeType,
      path: 'pending',
      storageMode: this.objects.kind === 'gcs' ? 'gcs' : 'indexeddb',
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
    }, this.now());
    document.storageObjectPath = buildObjectPath({
      subjectCode: subject?.code,
      workItemId: data.workItemId,
      category: data.category,
      documentId: document.id,
      fileName: `${document.id}-v1-${data.originalName}`,
    });
    document.pendingPath = document.storageObjectPath;
    document.storageMode = this.objects.kind === 'gcs' ? 'gcs' : 'indexeddb';
    await this.store.save(C.documents, document);
    const uploadUrl = await this.objects.createUploadUrl(document.storageObjectPath, inspection.mimeType, this.config.uploadExpirySeconds);
    const usage = await this.usageBytes();
    return {
      document,
      uploadUrl,
      warning: usage + data.sizeBytes > settings.storageSoftLimitMb * 1024 * 1024 ? 'This upload crosses the workspace storage soft limit.' : null,
    };
  }

  async completeUpload(id: string, actorInput: unknown) {
    const document = await this.store.get<DocumentRecord>(C.documents, id);
    if (!document) throw new ApiError(404, 'NOT_FOUND', 'Document not found.');
    const path = document.pendingPath || document.storageObjectPath;
    const stat = await this.objects.stat(path);
    if (!stat) {
      await this.store.save(C.documents, { ...document, status: 'failed', updatedAt: this.now() });
      throw new ApiError(400, 'UPLOAD_INCOMPLETE', 'The stored object was not found. Upload the file, then confirm it.');
    }
    if (stat.size !== document.pendingSizeBytes) {
      await this.objects.delete(path);
      await this.store.save(C.documents, { ...document, status: 'failed', updatedAt: this.now() });
      throw new ApiError(400, 'FILE_REJECTED', 'Uploaded size did not match the declared size.');
    }
    const head = await this.objects.readHead(path, 16);
    const extension = extensionOf(document.pendingOriginalName || document.originalName);
    const inspection = inspectFile(document.pendingOriginalName || document.originalName, document.pendingMimeType || stat.contentType, head ?? new Uint8Array(), stat.size, this.config.maxFileSizeMb * 1024 * 1024);
    if (!inspection.ok) {
      await this.objects.delete(path);
      await this.store.save(C.documents, { ...document, status: 'failed', updatedAt: this.now() });
      throw new ApiError(400, 'FILE_REJECTED', inspection.message);
    }
    void extension;
    const wasReplace = document.status === 'ready' && document.pendingPath && document.pendingPath !== document.storageObjectPath;
    let versions = await this.versionsFor(id);
    if (wasReplace) {
      const version: DocumentVersion = {
        id: createId('ver'),
        documentId: id,
        version: document.version,
        storageObjectPath: document.storageObjectPath,
        sizeBytes: document.sizeBytes,
        mimeType: document.mimeType,
        originalName: document.originalName,
        uploadedByLabel: document.uploadedByLabel,
        createdAt: this.now(),
      };
      await this.store.save(C.versions, version);
      versions = [version, ...versions];
    }
    const actor = await this.actor(actorInput);
    const ready: DocumentRecord = {
      ...document,
      status: 'ready',
      storageObjectPath: path,
      originalName: document.pendingOriginalName || document.originalName,
      mimeType: inspection.mimeType,
      sizeBytes: stat.size,
      version: wasReplace ? document.version + 1 : document.version,
      uploadedByLabel: actor.actorDisplayName,
      uploadedByMemberId: actor.actorMemberId,
      pendingPath: null,
      pendingOriginalName: null,
      pendingMimeType: null,
      pendingSizeBytes: null,
      updatedAt: this.now(),
    };
    try {
      await this.store.save(C.documents, ready);
    } catch (error) {
      await this.objects.delete(path);
      if (wasReplace) {
        const savedVersion = versions.find((version) => version.storageObjectPath === document.storageObjectPath);
        if (savedVersion) await this.store.remove(C.versions, savedVersion.id);
        try {
          await this.store.save(C.documents, { ...document, pendingPath: null, pendingOriginalName: null, pendingMimeType: null, pendingSizeBytes: null, updatedAt: this.now() });
        } catch { /* Preserve the original storage object even if Firestore is still unavailable. */ }
      } else {
        try { await this.store.remove(C.documents, id); } catch { /* The upload object is already cleaned up. */ }
      }
      throw error;
    }
    await this.trimVersions(versions);
    await this.log(makeActivity({
      eventType: wasReplace ? 'document_replaced' : 'document_uploaded',
      description: `${wasReplace ? 'Replaced' : 'Uploaded'} “${ready.displayName}”.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'document',
      relatedEntityId: id,
      relatedSubjectId: ready.subjectId,
      now: this.now(),
    }));
    return ready;
  }

  async replaceUpload(id: string, input: unknown) {
    const current = await this.readyDocument(id);
    const replacement = parse(DocumentMetaSchema, input);
    const data = parse(DocumentMetaSchema, { ...replacement, displayName: current.displayName, category: current.category, subjectId: current.subjectId, workItemId: current.workItemId });
    const header = decodeHeader(data.headerBase64);
    const inspection = inspectFile(data.originalName, data.mimeType ?? '', header, data.sizeBytes, this.config.maxFileSizeMb * 1024 * 1024);
    if (!inspection.ok) throw new ApiError(400, 'FILE_REJECTED', inspection.message);
    const subject = current.subjectId ? await this.store.get<Subject>(C.subjects, current.subjectId) : null;
    const path = buildObjectPath({
      subjectCode: subject?.code,
      workItemId: current.workItemId,
      category: current.category,
      documentId: current.id,
      fileName: `${current.id}-v${current.version + 1}-${data.originalName}`,
    });
    const pending = {
      ...current,
      pendingPath: path,
      pendingOriginalName: data.originalName,
      pendingMimeType: inspection.mimeType,
      pendingSizeBytes: data.sizeBytes,
      updatedAt: this.now(),
    };
    await this.store.save(C.documents, pending);
    const uploadUrl = await this.objects.createUploadUrl(path, inspection.mimeType, this.config.uploadExpirySeconds);
    return { document: pending, uploadUrl };
  }

  async download(id: string, disposition: 'inline' | 'attachment', versionId?: string) {
    const document = await this.readyDocument(id);
    let path = document.storageObjectPath;
    let fileName = document.originalName;
    if (versionId) {
      const version = (await this.versionsFor(id)).find((item) => item.id === versionId);
      if (!version) throw new ApiError(404, 'NOT_FOUND', 'Version not found.');
      path = version.storageObjectPath;
      fileName = version.originalName;
    } else {
      await this.store.save(C.documents, { ...document, lastAccessedAt: this.now() });
    }
    const url = await this.objects.createDownloadUrl(path, fileName, disposition, this.config.downloadExpirySeconds);
    return { url, fileName, expiresInSeconds: this.config.downloadExpirySeconds };
  }

  async updateDocument(id: string, input: { displayName?: string; description?: string; tags?: string[]; subjectId?: string | null; workItemId?: string | null; isArchived?: boolean }) {
    const document = await this.readyDocument(id);
    if (input.displayName !== undefined && !input.displayName.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'A document needs a name.');
    const next = {
      ...document,
      displayName: input.displayName?.trim() || document.displayName,
      description: input.description ?? document.description,
      tags: input.tags ?? document.tags,
      subjectId: input.subjectId === undefined ? document.subjectId : input.subjectId,
      workItemId: input.workItemId === undefined ? document.workItemId : input.workItemId,
      isArchived: input.isArchived ?? document.isArchived,
      archivedAt: input.isArchived ? document.archivedAt ?? this.now() : input.isArchived === false ? null : document.archivedAt,
      updatedAt: this.now(),
    };
    return this.store.save(C.documents, next);
  }

  async deleteDocument(id: string, actorInput: unknown, purge = false) {
    const document = await this.store.get<DocumentRecord>(C.documents, id);
    if (!document) throw new ApiError(404, 'NOT_FOUND', 'Document not found.');
    if (purge) {
      await this.objects.delete(document.storageObjectPath);
      if (document.pendingPath) await this.objects.delete(document.pendingPath);
      for (const version of await this.versionsFor(id)) {
        await this.objects.delete(version.storageObjectPath);
        await this.store.remove(C.versions, version.id);
      }
      await this.store.remove(C.documents, id);
      return { id, purged: true };
    }
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: 'document_deleted',
      description: `Moved “${document.displayName}” to trash.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'document',
      relatedEntityId: id,
      relatedSubjectId: document.subjectId,
      now: this.now(),
    }));
    return this.store.save(C.documents, { ...document, isDeleted: true, deletedAt: this.now(), updatedAt: this.now() });
  }

  async restoreDocument(id: string) {
    const document = await this.store.get<DocumentRecord>(C.documents, id);
    if (!document) throw new ApiError(404, 'NOT_FOUND', 'Document not found.');
    return this.store.save(C.documents, { ...document, isDeleted: false, deletedAt: null, updatedAt: this.now() });
  }

  async versions(id: string) {
    await this.readyDocument(id);
    return this.versionsFor(id);
  }

  async restoreVersion(id: string, versionId: string, actorInput: unknown) {
    const document = await this.readyDocument(id);
    const version = (await this.versionsFor(id)).find((item) => item.id === versionId);
    if (!version) throw new ApiError(404, 'NOT_FOUND', 'Version not found.');
    const previous: DocumentVersion = {
      id: createId('ver'),
      documentId: id,
      version: document.version,
      storageObjectPath: document.storageObjectPath,
      sizeBytes: document.sizeBytes,
      mimeType: document.mimeType,
      originalName: document.originalName,
      uploadedByLabel: document.uploadedByLabel,
      createdAt: this.now(),
    };
    await this.store.save(C.versions, previous);
    await this.store.remove(C.versions, version.id);
    const actor = await this.actor(actorInput);
    const next: DocumentRecord = {
      ...document,
      storageObjectPath: version.storageObjectPath,
      sizeBytes: version.sizeBytes,
      mimeType: version.mimeType,
      originalName: version.originalName,
      version: document.version + 1,
      uploadedByLabel: actor.actorDisplayName,
      updatedAt: this.now(),
    };
    await this.store.save(C.documents, next);
    await this.log(makeActivity({
      eventType: 'document_replaced',
      description: `Restored an earlier version of “${document.displayName}”.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'document',
      relatedEntityId: id,
      relatedSubjectId: document.subjectId,
      now: this.now(),
    }));
    return next;
  }

  async listTemplates() {
    return (await this.store.list<TemplateRecord>(C.templates)).filter((template) => !template.isDeleted).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createTemplate(input: unknown, actorInput: unknown) {
    const data = parse(TemplateInputSchema, input);
    if (data.subjectId) await this.getSubject(data.subjectId);
    const template = newTemplate(data, this.now());
    await this.store.save(C.templates, template);
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: 'template_added',
      description: `Added template “${template.name}”.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'template',
      relatedEntityId: template.id,
      relatedSubjectId: template.subjectId,
      now: this.now(),
    }));
    return template;
  }

  async updateTemplate(id: string, input: unknown) {
    const current = await this.store.get<TemplateRecord>(C.templates, id);
    if (!current || current.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Template not found.');
    const patch = parse(TemplatePatchSchema, input);
    const next = applyDefined<TemplateRecord>(current, { ...patch, updatedAt: this.now() } as Partial<TemplateRecord>);
    if (patch.checklistItems) {
      next.checklistItems = patch.checklistItems.map((item) => ({
        id: item.id ?? createId('item'),
        label: item.label,
        done: item.done ?? false,
        group: item.group ?? '',
      }));
    }
    return this.store.save(C.templates, next);
  }

  async deleteTemplate(id: string) {
    const current = await this.store.get<TemplateRecord>(C.templates, id);
    if (!current || current.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Template not found.');
    return this.store.save(C.templates, { ...current, isDeleted: true, deletedAt: this.now(), updatedAt: this.now() });
  }

  async listChecklists(workItemId?: string) {
    return (await this.store.list<Checklist>(C.checklists)).filter((list) => !list.isDeleted && (!workItemId || list.workItemId === workItemId));
  }

  async createChecklist(input: unknown, actorInput: unknown) {
    const data = parse(ChecklistInputSchema, input);
    if (data.workItemId) await this.getWorkItem(data.workItemId);
    const checklist = newChecklist(data, this.now());
    await this.store.save(C.checklists, checklist);
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: 'checklist_updated',
      description: `Added checklist “${checklist.title}”.`,
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'checklist',
      relatedEntityId: checklist.id,
      now: this.now(),
    }));
    return checklist;
  }

  async updateChecklist(id: string, input: unknown) {
    const current = await this.store.get<Checklist>(C.checklists, id);
    if (!current || current.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Checklist not found.');
    const patch = parse(ChecklistPatchSchema, input);
    const next = applyDefined<Checklist>(current, { ...patch, updatedAt: this.now() } as Partial<Checklist>);
    if (patch.items) {
      next.items = patch.items.map((item) => ({ id: item.id ?? createId('item'), label: item.label, done: item.done ?? false, group: item.group ?? '' }));
    }
    return this.store.save(C.checklists, next);
  }

  async listActivities(query: Record<string, string | undefined>) {
    let items = await this.store.list<Activity>(C.activities);
    if (query.type) items = items.filter((item) => item.eventType === query.type);
    if (query.subjectId) items = items.filter((item) => item.relatedSubjectId === query.subjectId);
    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter((item) => item.description.toLowerCase().includes(q) || item.actorDisplayName.toLowerCase().includes(q));
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return pageItems(items, Number(query.page ?? 1), Number(query.pageSize ?? 40));
  }

  async listNotifications() {
    return (await this.store.list<AppNotification>(C.notifications)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async dismissNotification(dedupeKey: string, title: string, body: string, href: string) {
    const existing = (await this.store.list<AppNotification>(C.notifications)).find((item) => item.dedupeKey === dedupeKey);
    const notification: AppNotification = existing ?? {
      id: createId('note'),
      title,
      body,
      severity: 'info',
      href,
      dedupeKey,
      readAt: null,
      createdAt: this.now(),
    };
    notification.readAt = this.now();
    return this.store.save(C.notifications, notification);
  }

  async analytics(query: Record<string, string | undefined>) {
    const snapshot = await this.snapshot();
    return buildAnalytics(snapshot, new Date(), { subjectId: query.subjectId, from: query.from, to: query.to });
  }

  async search(q: string) {
    return searchWorkspace(await this.snapshot(), q);
  }

  async exportWorkspace() {
    return buildExport(await this.snapshot(), this.now());
  }

  async importWorkspace(body: { confirm?: string; snapshot?: WorkspaceSnapshot }) {
    if (body.confirm !== 'REPLACE WORKSPACE') throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Type REPLACE WORKSPACE to import over the current records.');
    const snapshot = body.snapshot;
    if (!snapshot?.subjects || !snapshot.workItems || !snapshot.settings) throw new ApiError(400, 'VALIDATION_ERROR', 'The backup is missing workspace records.');
    const importedFiles = snapshot.documents ?? [];
    if (this.objects.kind === 'gcs') {
      const currentDocuments = await this.store.list<DocumentRecord>(C.documents);
      const currentVersions = await this.store.list<DocumentVersion>(C.versions);
      for (const document of currentDocuments) {
        await this.objects.delete(document.storageObjectPath);
        if (document.pendingPath) await this.objects.delete(document.pendingPath);
      }
      for (const version of currentVersions) await this.objects.delete(version.storageObjectPath);
    }
    await this.clearCollections();
    for (const subject of snapshot.subjects) await this.store.save(C.subjects, subject);
    for (const item of snapshot.workItems) await this.store.save(C.workItems, item);
    for (const task of snapshot.tasks ?? []) await this.store.save(C.tasks, task);
    for (const member of snapshot.members ?? []) await this.store.save(C.members, member);
    // Structured exports do not include bytes. Never restore client-supplied object paths in Cloud Mode.
    if (this.objects.kind !== 'gcs') {
      for (const document of importedFiles) await this.store.save(C.documents, document);
      for (const version of snapshot.versions ?? []) await this.store.save(C.versions, version);
    }
    for (const template of snapshot.templates ?? []) await this.store.save(C.templates, template);
    for (const checklist of snapshot.checklists ?? []) await this.store.save(C.checklists, checklist);
    for (const activity of snapshot.activities ?? []) await this.store.save(C.activities, activity);
    await this.store.save(C.settings, { ...defaultSettings(this.now()), ...snapshot.settings, id: 'workspace' });
    return { imported: true, skippedCloudFiles: this.objects.kind === 'gcs' ? importedFiles.length : 0 };
  }

  async seedDemo(actorInput: unknown) {
    const bundle = buildSemesterSeed(new Date());
    for (const subject of bundle.snapshot.subjects) await this.store.save(C.subjects, subject);
    for (const member of bundle.snapshot.members) await this.store.save(C.members, member);
    for (const item of bundle.snapshot.workItems) await this.store.save(C.workItems, item);
    for (const task of bundle.snapshot.tasks) await this.store.save(C.tasks, task);
    for (const template of bundle.snapshot.templates) await this.store.save(C.templates, template);
    for (const checklist of bundle.snapshot.checklists) await this.store.save(C.checklists, checklist);
    for (const activity of bundle.snapshot.activities) await this.store.save(C.activities, activity);
    for (const file of bundle.files) {
      const document = { ...file.document, storageMode: this.objects.kind === 'gcs' ? 'gcs' as const : 'indexeddb' as const };
      if (file.version) {
        await this.objects.save(file.version.storageObjectPath, file.bytes, file.version.mimeType);
        await this.store.save(C.versions, file.version);
      } else {
        await this.objects.save(document.storageObjectPath, file.bytes, document.mimeType);
        await this.store.save(C.documents, document);
      }
    }
    if (!(await this.store.get(C.settings, 'workspace'))) await this.store.save(C.settings, bundle.snapshot.settings);
    const actor = await this.actor(actorInput);
    await this.log(makeActivity({
      eventType: 'workspace_imported',
      description: 'Loaded the Semester 5 demonstration workspace.',
      actor: { memberId: actor.actorMemberId, displayName: actor.actorDisplayName },
      actorName: actor.actorDisplayName,
      relatedEntityType: 'workspace',
      relatedEntityId: 'workspace',
      now: this.now(),
    }));
    return { seeded: true };
  }

  async resetDemo() {
    for (const collection of Object.values(C)) {
      const rows = await this.store.list<{ id: string; isDemo?: boolean; storageObjectPath?: string }>(collection);
      for (const row of rows) {
        if (row.isDemo) {
          if (row.storageObjectPath) await this.objects.delete(row.storageObjectPath);
          await this.store.remove(collection, row.id);
        }
      }
    }
    return this.seedDemo({});
  }

  async clearWorkspace(confirm?: string) {
    if (confirm !== 'CLEAR WORKSPACE') throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Type CLEAR WORKSPACE to remove the shared records.');
    const documents = await this.store.list<DocumentRecord>(C.documents);
    const versions = await this.store.list<DocumentVersion>(C.versions);
    for (const document of documents) {
      await this.objects.delete(document.storageObjectPath);
      if (document.pendingPath) await this.objects.delete(document.pendingPath);
    }
    for (const version of versions) await this.objects.delete(version.storageObjectPath);
    await this.clearCollections();
    await this.store.save(C.settings, defaultSettings(this.now()));
    return { cleared: true };
  }

  private async clearCollections() {
    for (const collection of Object.values(C)) {
      const rows = await this.store.list<{ id: string }>(collection);
      for (const row of rows) await this.store.remove(collection, row.id);
    }
  }

  private async readyDocument(id: string) {
    const document = await this.store.get<DocumentRecord>(C.documents, id);
    if (!document || document.status !== 'ready' || document.isDeleted) throw new ApiError(404, 'NOT_FOUND', 'Document not found.');
    return document;
  }

  private async versionsFor(id: string) {
    return (await this.store.list<DocumentVersion>(C.versions))
      .filter((version) => version.documentId === id)
      .sort((a, b) => b.version - a.version);
  }

  private async trimVersions(versions: DocumentVersion[]) {
    const settings = await this.settings();
    const extra = versions.slice(settings.maxRetainedVersions);
    for (const version of extra) {
      await this.objects.delete(version.storageObjectPath);
      await this.store.remove(C.versions, version.id);
    }
  }

  private async usageBytes() {
    const documents = await this.store.list<DocumentRecord>(C.documents);
    const versions = await this.store.list<DocumentVersion>(C.versions);
    return documents.reduce((sum, document) => sum + (document.status === 'ready' ? document.sizeBytes : 0), 0) + versions.reduce((sum, version) => sum + version.sizeBytes, 0);
  }

  private async recalculateProgress(workItemId: string) {
    const item = await this.store.get<WorkItem>(C.workItems, workItemId);
    if (!item) return;
    const tasks = (await this.store.list<Task>(C.tasks)).filter((task) => task.workItemId === workItemId);
    const progress = progressFromTasks(tasks);
    if (progress == null) return;
    await this.store.save(C.workItems, { ...item, progress, updatedAt: this.now() });
  }

  private async assertMembers(ids: string[], leadId: string | null) {
    const members = await this.listMembers();
    const known = new Set(members.map((member) => member.id));
    for (const id of [...ids, ...(leadId ? [leadId] : [])]) {
      if (!known.has(id)) throw new ApiError(400, 'VALIDATION_ERROR', 'Choose teammates from the directory.');
    }
  }
}

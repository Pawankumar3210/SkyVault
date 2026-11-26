import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Check, CheckSquare, CloudUpload, FileText, FolderKanban, ListTodo, ShieldAlert, Users } from 'lucide-react';
import { buildAnalytics } from '@shared/analytics';
import { zonedDateKey } from '@shared/dates';
import { formatBytes, inspectFile } from '@shared/files';
import { newChecklist, newMember, newSubject, newTask, newTemplate, newWorkItem } from '@shared/factory';
import { buildExport, createId, makeActivity } from '@shared/records';
import type {
  Activity as ActivityRecord, Checklist, DocumentCategory, DocumentRecord, DocumentVersion, Subject, Task, TeamMember, TemplateRecord, WorkItem,
  WorkspaceSnapshot,
} from '@shared/types';
import { getDemoFile, isDemoMode, loadWorkspace, putDemoFile, request, resetDemoWorkspace, clearDemoWorkspace, saveDemo } from './services/workspace';
import type { DeleteKind, ModalKind, ModalTarget, Section, WorkView } from './contracts';
import { Shell, type SearchHit } from './components/shell';
import { RecordForm } from './components/forms';
import { Button, EmptyState, Modal } from './components/ui';
import { Dashboard } from './pages/dashboard';
import { WorkDetail, WorkPage } from './pages/work';
import { SubjectsPage } from './pages/subjects';
import { TeamPage } from './pages/team';
import { VaultPage } from './pages/vault';
import { ChecklistsPage, TemplatesPage } from './pages/templates';
import { ActivityPage, CalendarPage } from './pages/activity';
import { AnalyticsPage } from './pages/analytics';
import { ArchivePage, SettingsPage } from './pages/system';

const sections: Section[] = ['home', 'projects', 'assignments', 'labs', 'subjects', 'team', 'vault', 'templates', 'checklists', 'calendar', 'analytics', 'archive', 'settings', 'activity'];

function putSignedFile(url: string, file: File, mimeType: string, onProgress: (percentage: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    xhr.onerror = () => reject(new Error('The upload connection failed. Check the network and bucket CORS settings.'));
    xhr.onabort = () => reject(new Error('The upload was cancelled.'));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`));
    xhr.send(file);
  });
}

export function App() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateRecord | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('sky-vault-theme') !== 'light');
  const [actorId, setActorId] = useState(() => localStorage.getItem('sky-vault-actor') ?? '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [projectView, setProjectView] = useState<WorkView>('list');
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const demo = isDemoMode();

  const path = location.pathname.split('/').filter(Boolean);
  const activeSection: Section = path[0] === 'work' ? 'projects' : sections.includes(path[0] as Section) ? path[0] as Section : 'home';
  const selectedWork = snapshot?.workItems.find((item) => item.id === path[1] && !item.isDeleted) ?? null;

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3600); }, []);
  const toggleSidebar = useCallback(() => {
    if (window.matchMedia('(max-width: 820px)').matches) setMobileNav((value) => !value);
    else setSidebarCollapsed((value) => !value);
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setSnapshot(await loadWorkspace()); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the workspace.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('sky-vault-theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { localStorage.setItem('sky-vault-actor', actorId); }, [actorId]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
      if (event.key === 'Escape') { setSearchOpen(false); setQuickOpen(false); setNotificationsOpen(false); setModal(null); setModalTarget(null); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const persist = useCallback(async (next: WorkspaceSnapshot, message = 'Changes saved') => {
    setSnapshot(next);
    if (demo) await saveDemo(next);
    notify(message);
  }, [demo, notify]);

  const selectedActor = snapshot?.members.find((member) => member.id === actorId && !member.isDeleted);
  const reportedActor = useMemo(() => ({ memberId: actorId || undefined, displayName: selectedActor?.name ?? '' }), [actorId, selectedActor?.name]);

  const cloudAction = useCallback(async <T,>(apiPath: string, method: string, body?: unknown, message = 'Changes saved'): Promise<T | undefined> => {
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? { ...(body as Record<string, unknown>), actor: reportedActor } : { actor: reportedActor };
    const result = await request<T>(apiPath, { method, body: JSON.stringify(payload) });
    await refresh();
    notify(message);
    return result;
  }, [notify, refresh, reportedActor]);

  const addActivity = (current: WorkspaceSnapshot, eventType: ActivityRecord['eventType'], description: string, entityType: string, entityId: string, subjectId: string | null = null): ActivityRecord => makeActivity({
    eventType,
    description,
    actor: { memberId: actorId || null, displayName: current.members.find((member) => member.id === actorId)?.name ?? '' },
    relatedEntityType: entityType,
    relatedEntityId: entityId,
    relatedSubjectId: subjectId,
  });

  const openModal = (kind: Exclude<ModalKind, null>, target: ModalTarget = null) => {
    setModal(kind);
    setModalTarget(target);
    setQuickOpen(false);
    setMobileNav(false);
  };

  const closeModal = () => { setModal(null); setModalTarget(null); };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot || !modal) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? '').trim();
    const now = new Date().toISOString();
    let createdTemplate: TemplateRecord | null = null;
    setBusy(true);
    try {
      if (modal === 'subject') {
        const data = { name: value('name'), code: value('code'), description: value('description'), color: value('color') || '#47C9FF' };
        if (modalTarget && 'color' in modalTarget) {
          if (demo) await persist({ ...snapshot, subjects: snapshot.subjects.map((entry) => entry.id === modalTarget.id ? { ...entry, ...data, updatedAt: now } : entry) }, 'Subject updated');
          else await cloudAction(`/subjects/${modalTarget.id}`, 'PATCH', data, 'Subject updated');
        } else if (demo) {
          const item = newSubject(data, now);
          await persist({ ...snapshot, subjects: [...snapshot.subjects, item], activities: [addActivity(snapshot, 'subject_created', `Added subject ${item.name}.`, 'subject', item.id, item.id), ...snapshot.activities] }, 'Subject added');
        } else await cloudAction('/subjects', 'POST', data, 'Subject added');
      }

      if (modal === 'project' || modal === 'assignment' || modal === 'lab') {
        const type: WorkItem['type'] = modal;
        const data = {
          title: value('title'), type,
          projectType: type === 'project' ? value('projectType') || 'group' : null,
          subjectId: value('subjectId'), description: value('description'), instructions: value('instructions'),
          status: value('status') || 'not_started', priority: value('priority') || 'medium',
          startDate: value('startDate') || null, dueDate: value('dueDate') || null,
          projectLeadId: value('projectLeadId') || null, teamMemberIds: form.getAll('teamMemberIds').map(String),
          category: value('category'), submissionFormat: value('format'), labNumber: value('labNumber'), experimentNumber: value('experimentNumber'),
          objective: value('objective'), requiredTools: value('requiredTools'), tags: value('tags').split(',').map((tag) => tag.trim()).filter(Boolean),
        };
        const workTarget = modalTarget && 'type' in modalTarget ? modalTarget as WorkItem : null;
        if (workTarget) {
          if (demo) await persist({ ...snapshot, workItems: snapshot.workItems.map((item) => item.id === workTarget.id ? {
            ...item, ...data, projectType: data.projectType as WorkItem['projectType'], status: String(data.status), priority: data.priority as WorkItem['priority'],
            startDate: data.startDate, dueDate: data.dueDate, teamMemberIds: data.teamMemberIds, projectLeadId: data.projectLeadId, updatedAt: now,
          } : item) }, 'Academic work updated');
          else await cloudAction(`/work-items/${workTarget.id}`, 'PATCH', data, 'Academic work updated');
        } else if (demo) {
          const item = newWorkItem(data as Parameters<typeof newWorkItem>[0], now);
          await persist({ ...snapshot, workItems: [item, ...snapshot.workItems], activities: [addActivity(snapshot, 'project_created', `Created ${type} “${item.title}”.`, 'work_item', item.id, item.subjectId), ...snapshot.activities] }, `${type[0].toUpperCase()}${type.slice(1)} created`);
        } else await cloudAction('/work-items', 'POST', data, `${type[0].toUpperCase()}${type.slice(1)} created`);
      }

      if (modal === 'member') {
        const data = { name: value('name'), email: value('email'), academicRole: value('academicRole'), skills: value('skills').split(',').map((entry) => entry.trim()).filter(Boolean), notes: value('notes') };
        const memberTarget = modalTarget && 'email' in modalTarget ? modalTarget as TeamMember : null;
        if (memberTarget) {
          if (demo) await persist({ ...snapshot, members: snapshot.members.map((member) => member.id === memberTarget.id ? { ...member, ...data, updatedAt: now } : member) }, 'Teammate updated');
          else await cloudAction(`/team-members/${memberTarget.id}`, 'PATCH', data, 'Teammate updated');
        } else if (demo) {
          const member = newMember(data, now);
          await persist({ ...snapshot, members: [...snapshot.members, member], activities: [addActivity(snapshot, 'teammate_added', `Added teammate ${member.name}.`, 'member', member.id), ...snapshot.activities] }, 'Teammate added');
        } else await cloudAction('/team-members', 'POST', data, 'Teammate added');
      }

      if (modal === 'task') {
        const data = { title: value('title'), description: value('description'), workItemId: value('workItemId'), assignedMemberId: value('assignedMemberId') || null, dueDate: value('dueDate') || null, priority: value('priority') || 'medium' };
        if (demo) {
          const task = newTask(data as Parameters<typeof newTask>[0], now);
          const related = snapshot.workItems.find((item) => item.id === task.workItemId);
          if (!related) throw new Error('Select the work item this task belongs to.');
          const tasks = [...snapshot.tasks, task];
          const rows = tasks.filter((entry) => entry.workItemId === related.id && !entry.isDeleted);
          const progress = Math.round(rows.filter((entry) => entry.status === 'done').length / rows.length * 100);
          await persist({
            ...snapshot, tasks, workItems: snapshot.workItems.map((item) => item.id === related.id ? { ...item, progress, updatedAt: now } : item),
            activities: [addActivity(snapshot, task.assignedMemberId ? 'task_assigned' : 'task_created', `Added task “${task.title}”.`, 'task', task.id, related.subjectId), ...snapshot.activities],
          }, 'Task created');
        } else await cloudAction('/tasks', 'POST', data, 'Task created');
      }

      if (modal === 'template') {
        const data = {
          name: value('name'), subjectId: value('subjectId') || null, templateCategory: value('templateCategory') || 'project_report',
          description: value('description'), source: value('source'), versionLabel: value('versionLabel') || '1', instructions: value('instructions'),
          isOfficial: form.get('isOfficial') === 'on', checklistItems: value('checklistItems').split('\n').map((label) => label.trim()).filter(Boolean).map((label) => ({ label, done: false })),
        };
        if (demo) {
          const template = newTemplate(data as Parameters<typeof newTemplate>[0], now);
          await persist({ ...snapshot, templates: [...snapshot.templates, template] }, 'Template added');
          createdTemplate = template;
        } else {
          const result = await cloudAction<TemplateRecord>('/templates', 'POST', data, 'Template added');
          if (result?.id) createdTemplate = result;
        }
      }

      if (modal === 'checklist') {
        const data = {
          title: value('title'), workItemId: value('workItemId') || null, templateId: null,
          items: value('items').split('\n').map((label) => label.trim()).filter(Boolean).map((label) => ({ label, done: false, group: '' })),
        };
        if (demo) {
          const checklist = newChecklist(data as Parameters<typeof newChecklist>[0], now);
          await persist({ ...snapshot, checklists: [...snapshot.checklists, checklist] }, 'Checklist created');
        } else await cloudAction('/checklists', 'POST', data, 'Checklist created');
      }

      closeModal();
      if (createdTemplate) setPendingTemplate(createdTemplate);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  };

  const updateWork = async (item: WorkItem, patch: Partial<WorkItem>) => {
    if (!snapshot) return;
    try {
      if (demo) {
        const now = new Date().toISOString();
        const next = { ...item, ...patch, updatedAt: now, ...(patch.status === 'completed' || patch.status === 'submitted' ? { completedAt: now } : {}) };
        const event = patch.status && patch.status !== item.status ? 'status_updated' : 'project_edited';
        await persist({ ...snapshot, workItems: snapshot.workItems.map((work) => work.id === item.id ? next : work), activities: [addActivity(snapshot, event, `${item.title} updated${patch.status ? ` to ${patch.status.replaceAll('_', ' ')}` : ''}.`, 'work_item', item.id, item.subjectId), ...snapshot.activities] });
      } else await cloudAction(`/work-items/${item.id}`, 'PATCH', patch);
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Could not update this item.'); }
  };

  const updateTask = async (task: Task, patch: Partial<Task>) => {
    if (!snapshot) return;
    try {
      if (demo) {
        const tasks = snapshot.tasks.map((row) => row.id === task.id ? { ...row, ...patch, updatedAt: new Date().toISOString(), completedAt: patch.status === 'done' ? new Date().toISOString() : patch.status ? null : row.completedAt } : row);
        const rows = tasks.filter((row) => row.workItemId === task.workItemId && !row.isDeleted);
        const progress = rows.length ? Math.round(rows.filter((row) => row.status === 'done').length / rows.length * 100) : 0;
        await persist({ ...snapshot, tasks, workItems: snapshot.workItems.map((item) => item.id === task.workItemId ? { ...item, progress } : item) });
      } else await cloudAction(`/tasks/${task.id}`, 'PATCH', patch);
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Could not update this task.'); }
  };

  const updateChecklist = async (checklist: Checklist, items: Checklist['items']) => {
    if (!snapshot) return;
    if (demo) await persist({ ...snapshot, checklists: snapshot.checklists.map((row) => row.id === checklist.id ? { ...row, items, updatedAt: new Date().toISOString() } : row) });
    else await cloudAction(`/checklists/${checklist.id}`, 'PATCH', { items });
  };

  const softDelete = async (kind: DeleteKind, record: Subject | WorkItem | TeamMember | TemplateRecord | DocumentRecord) => {
    if (!snapshot) return;
    const label = 'title' in record ? record.title : 'name' in record ? record.name : record.displayName;
    if (!window.confirm(`Remove “${label}”? It will move to the archive so it can be restored.`)) return;
    try {
      if (demo) {
        const now = new Date().toISOString();
        const mark = <T extends { id: string }>(rows: T[]) => rows.map((row) => row.id === record.id ? { ...row, isDeleted: true, deletedAt: now, updatedAt: now } : row);
        const changed: WorkspaceSnapshot = kind === 'subject' ? { ...snapshot, subjects: mark(snapshot.subjects) }
          : kind === 'work' ? { ...snapshot, workItems: mark(snapshot.workItems) }
            : kind === 'member' ? { ...snapshot, members: mark(snapshot.members) }
              : kind === 'template' ? { ...snapshot, templates: mark(snapshot.templates) }
                : { ...snapshot, documents: mark(snapshot.documents) };
        await persist(changed, 'Moved to archive');
      } else {
        const endpoint = kind === 'subject' ? `/subjects/${record.id}` : kind === 'work' ? `/work-items/${record.id}` : kind === 'member' ? `/team-members/${record.id}` : kind === 'template' ? `/templates/${record.id}` : `/documents/${record.id}`;
        await cloudAction(endpoint, 'DELETE', {}, 'Moved to archive');
      }
      if (kind === 'work' && 'type' in record && path[1] === record.id) navigate(`/${record.type === 'project' ? 'projects' : record.type === 'assignment' ? 'assignments' : 'labs'}`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Could not remove this record.'); }
  };

  const uploadFiles = async (files: FileList | File[] | null, category: DocumentCategory = 'other'): Promise<DocumentRecord[]> => {
    if (!snapshot || !files?.length) return [];
    const created: DocumentRecord[] = [];
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        setUploadProgress(0);
        const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
        const inspection = inspectFile(file.name, file.type, head, file.size, snapshot.settings.maxFileSizeMb * 1024 * 1024);
        if (!inspection.ok) throw new Error(`${file.name}: ${inspection.message}`);
        const base = {
          displayName: file.name.replace(/\.[^.]+$/, ''), originalName: file.name, category, mimeType: inspection.mimeType,
          sizeBytes: file.size, subjectId: null, workItemId: null, description: '', tags: [],
          headerBase64: btoa(String.fromCharCode(...head)),
        };
        const used = snapshot.documents.filter((doc) => doc.status === 'ready' && !doc.isDeleted).reduce((sum, doc) => sum + doc.sizeBytes, 0);
        if (used + file.size > snapshot.settings.storageSoftLimitMb * 1024 * 1024) notify(`Storage warning: ${formatBytes(used + file.size)} would cross the soft limit.`);
        if (demo) {
          const id = createId('doc');
          const storagePath = `demo/${id}/${file.name}`;
          const now = new Date().toISOString();
          const doc: DocumentRecord = {
            id, ...base, storageObjectPath: storagePath, storageMode: 'indexeddb', templateId: null, version: 1,
            uploadedByLabel: selectedActor?.name ?? 'Unassigned actor', uploadedByMemberId: actorId || null, status: 'ready',
            pendingPath: null, pendingOriginalName: null, pendingMimeType: null, pendingSizeBytes: null, lastAccessedAt: null,
            isDemo: true, isArchived: false, archivedAt: null, isDeleted: false, deletedAt: null, createdAt: now, updatedAt: now,
          };
          await putDemoFile(storagePath, file);
          await persist({ ...snapshot, documents: [doc, ...snapshot.documents], activities: [addActivity(snapshot, 'document_uploaded', `Uploaded “${doc.displayName}”.`, 'document', doc.id), ...snapshot.activities] }, 'Document uploaded');
          created.push(doc);
        } else {
          const prepared = await request<{ document: DocumentRecord; uploadUrl: string }>('/documents/upload-url', { method: 'POST', body: JSON.stringify({ ...base, actor: reportedActor }) });
          await putSignedFile(prepared.uploadUrl, file, inspection.mimeType, setUploadProgress);
          await request(`/documents/${prepared.document.id}/complete`, { method: 'POST', body: JSON.stringify({ actor: reportedActor }) });
          await refresh();
          notify(`${file.name} uploaded to Cloud Storage`);
          created.push(prepared.document);
        }
      }
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Upload failed.'); }
    finally { setBusy(false); setUploadProgress(0); }
    return created;
  };

  useEffect(() => {
    const handleUpload = (event: Event) => { void uploadFiles((event as CustomEvent<FileList>).detail); };
    window.addEventListener('sky-upload', handleUpload);
    return () => window.removeEventListener('sky-upload', handleUpload);
  }, [uploadFiles]);

  const downloadFile = async (doc: DocumentRecord) => {
    try {
      if (demo) {
        const blob = await getDemoFile(doc.storageObjectPath);
        if (!blob) throw new Error('This demonstration file is unavailable.');
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = doc.originalName; anchor.click(); URL.revokeObjectURL(url);
      } else {
        const result = await request<{ url: string; fileName: string }>(`/documents/${doc.id}/download`);
        const anchor = document.createElement('a');
        anchor.href = result.url; anchor.download = result.fileName; anchor.click();
      }
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Download failed.'); }
  };

  const previewFile = async (doc: DocumentRecord) => {
    try {
      let url: string;
      if (demo) {
        const blob = await getDemoFile(doc.storageObjectPath);
        if (!blob) throw new Error('This demonstration file is unavailable.');
        url = URL.createObjectURL(blob);
      } else url = (await request<{ url: string }>(`/documents/${doc.id}/download?inline=1`)).url;
      const link = document.createElement('a');
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click();
      if (demo) window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Preview failed.'); }
  };

  const renameFile = async (doc: DocumentRecord) => {
    if (!snapshot) return;
    const displayName = window.prompt('Document display name', doc.displayName)?.trim();
    if (!displayName || displayName === doc.displayName) return;
    if (demo) await persist({ ...snapshot, documents: snapshot.documents.map((row) => row.id === doc.id ? { ...row, displayName, updatedAt: new Date().toISOString() } : row) }, 'Document renamed');
    else await cloudAction(`/documents/${doc.id}`, 'PATCH', { displayName }, 'Document renamed');
  };

  const replaceFile = async (doc: DocumentRecord, file: File) => {
    if (!snapshot) return;
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const inspection = inspectFile(file.name, file.type, head, file.size, snapshot.settings.maxFileSizeMb * 1024 * 1024);
    if (!inspection.ok) { notify(inspection.message); return; }
    setBusy(true); setUploadProgress(0);
    try {
      if (demo) {
        const oldBlob = await getDemoFile(doc.storageObjectPath);
        if (!oldBlob) throw new Error('The current document bytes are unavailable for versioning.');
        const storagePath = `demo/${doc.id}/v${doc.version + 1}/${file.name}`;
        const version: DocumentVersion = {
          id: createId('ver'), documentId: doc.id, version: doc.version, storageObjectPath: doc.storageObjectPath, sizeBytes: doc.sizeBytes,
          mimeType: doc.mimeType, originalName: doc.originalName, uploadedByLabel: selectedActor?.name ?? 'Unassigned actor', createdAt: new Date().toISOString(),
        };
        await putDemoFile(storagePath, file);
        await persist({
          ...snapshot,
          documents: snapshot.documents.map((row) => row.id === doc.id ? { ...row, storageObjectPath: storagePath, originalName: file.name, sizeBytes: file.size, mimeType: inspection.mimeType, version: doc.version + 1, updatedAt: new Date().toISOString() } : row),
          versions: [version, ...snapshot.versions],
        }, 'New document version uploaded');
      } else {
        const meta = {
          displayName: doc.displayName, originalName: file.name, category: doc.category, mimeType: inspection.mimeType, sizeBytes: file.size,
          subjectId: doc.subjectId, workItemId: doc.workItemId, description: doc.description, tags: doc.tags,
          headerBase64: btoa(String.fromCharCode(...head)),
        };
        const prepared = await request<{ uploadUrl: string }>(`/documents/${doc.id}/replace-url`, { method: 'POST', body: JSON.stringify({ ...meta, actor: reportedActor }) });
        await putSignedFile(prepared.uploadUrl, file, inspection.mimeType, setUploadProgress);
        await request(`/documents/${doc.id}/complete`, { method: 'POST', body: JSON.stringify({ actor: reportedActor }) });
        await refresh();
        notify('New document version uploaded');
      }
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Replacement failed.'); }
    finally { setBusy(false); setUploadProgress(0); }
  };

  const restoreDocument = async (doc: DocumentRecord) => {
    if (!snapshot) return;
    if (demo) await persist({ ...snapshot, documents: snapshot.documents.map((row) => row.id === doc.id ? { ...row, isDeleted: false, deletedAt: null, isArchived: false, archivedAt: null, updatedAt: new Date().toISOString() } : row) }, 'Document restored');
    else await cloudAction(`/documents/${doc.id}/restore`, 'POST', {}, 'Document restored');
  };

  const restoreVersion = async (doc: DocumentRecord, version: DocumentVersion) => {
    if (!snapshot) return;
    if (demo) {
      const current: DocumentVersion = {
        id: createId('ver'), documentId: doc.id, version: doc.version, storageObjectPath: doc.storageObjectPath, sizeBytes: doc.sizeBytes,
        mimeType: doc.mimeType, originalName: doc.originalName, uploadedByLabel: selectedActor?.name ?? 'Unassigned actor', createdAt: new Date().toISOString(),
      };
      await persist({
        ...snapshot,
        documents: snapshot.documents.map((row) => row.id === doc.id ? { ...row, storageObjectPath: version.storageObjectPath, sizeBytes: version.sizeBytes, mimeType: version.mimeType, originalName: version.originalName, version: doc.version + 1, updatedAt: new Date().toISOString() } : row),
        versions: [current, ...snapshot.versions.filter((row) => row.id !== version.id)],
      }, 'Previous version restored');
    } else await cloudAction(`/documents/${doc.id}/versions/${version.id}/restore`, 'POST', {}, 'Previous version restored');
  };

  const restoreWork = async (item: WorkItem) => {
    if (!snapshot) return;
    if (demo) await persist({ ...snapshot, workItems: snapshot.workItems.map((row) => row.id === item.id ? { ...row, isDeleted: false, deletedAt: null, isArchived: false, archivedAt: null } : row) }, 'Work restored');
    else await cloudAction(`/work-items/${item.id}/restore`, 'POST', {}, 'Work restored');
  };

  const restoreSubject = async (subject: Subject) => {
    if (!snapshot) return;
    if (demo) await persist({ ...snapshot, subjects: snapshot.subjects.map((row) => row.id === subject.id ? { ...row, isDeleted: false, deletedAt: null, isArchived: false, archivedAt: null } : row) }, 'Subject restored');
    else await cloudAction(`/subjects/${subject.id}/restore`, 'POST', {}, 'Subject restored');
  };

  const exportWorkspace = async () => {
    if (!snapshot) return;
    try {
      const data = demo ? buildExport(snapshot) : await request<ReturnType<typeof buildExport>>('/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `sky-vault-semester-5-${zonedDateKey(new Date())}.json`; anchor.click();
      URL.revokeObjectURL(url);
      notify('Workspace export downloaded');
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Export failed.'); }
  };

  const importWorkspace = async (file: File) => {
    if (!snapshot) return;
    try {
      const parsed = JSON.parse(await file.text()) as WorkspaceSnapshot;
      if (!parsed.subjects || !parsed.workItems || !parsed.settings) throw new Error('This file is not a Sky Vault workspace export.');
      if (demo) await persist(parsed, 'Workspace imported');
      else await cloudAction('/import', 'POST', { confirm: 'REPLACE WORKSPACE', snapshot: parsed }, 'Workspace imported. Upload file bytes again in Cloud Mode.');
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'The selected backup is not valid JSON.'); }
  };

  const updateSettings = async (patch: Partial<WorkspaceSnapshot['settings']>) => {
    if (!snapshot) return;
    if (demo) await persist({ ...snapshot, settings: { ...snapshot.settings, ...patch, updatedAt: new Date().toISOString() } }, 'Settings saved');
    else await cloudAction('/settings', 'PATCH', patch, 'Settings saved');
  };

  const resetDemo = async () => {
    setBusy(true);
    try {
      if (demo) {
        const next = await resetDemoWorkspace();
        if (next) { setSnapshot(next); notify('Demo workspace restored to its seed data'); }
      } else await cloudAction('/demo/reset', 'POST', {}, 'Demo workspace restored to its seed data');
      setPendingTemplate(null); setStatusFilter('all'); setSubjectFilter('all');
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Reset failed.'); }
    finally { setBusy(false); }
  };

  const clearWorkspace = async () => {
    setBusy(true);
    try {
      if (demo) {
        const next = await clearDemoWorkspace();
        if (next) { setSnapshot(next); notify('Workspace cleared'); }
      } else await cloudAction('/workspace/clear', 'POST', { confirm: 'CLEAR WORKSPACE' }, 'Workspace cleared');
      setPendingTemplate(null); setStatusFilter('all'); setSubjectFilter('all');
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Clear failed.'); }
    finally { setBusy(false); }
  };

  const patchTemplate = async (template: TemplateRecord, patch: Partial<TemplateRecord>) => {
    if (!snapshot) return;
    if (demo) await persist({ ...snapshot, templates: snapshot.templates.map((row) => row.id === template.id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row) }, 'Template updated');
    else await cloudAction(`/templates/${template.id}`, 'PATCH', patch, 'Template updated');
  };

  const attachTemplateFile = async (file: File | null) => {
    if (!file || !pendingTemplate) { setPendingTemplate(null); return; }
    const docs = await uploadFiles([file], 'template');
    if (docs[0]) await patchTemplate(pendingTemplate, { documentId: docs[0].id });
    setPendingTemplate(null);
  };

  const useTemplate = async (template: TemplateRecord) => {
    if (!snapshot) return;
    const data = {
      title: `${template.name} checklist`, workItemId: null, templateId: template.id,
      items: template.checklistItems.map((item) => ({ ...item, done: false })),
    };
    if (demo) {
      const checklist = newChecklist(data as Parameters<typeof newChecklist>[0], new Date().toISOString());
      await persist({ ...snapshot, checklists: [...snapshot.checklists, checklist] }, 'Checklist created from template');
    } else await cloudAction('/checklists', 'POST', data, 'Checklist created from template');
    navigate('/checklists');
  };

  if (loading && !snapshot) return <div className="loading-screen"><div className="orbit-loader"><span /><i /></div><strong>Opening Sky Vault</strong><small>Preparing the Semester 5 workspace…</small></div>;
  if (!snapshot) return <div className="fatal-screen"><div className="fatal-mark">SV</div><h1>Workspace unavailable</h1><p>{error || 'The workspace could not be loaded.'}</p><Button variant="primary" onClick={() => void refresh()}>Try again</Button></div>;

  const analytics = buildAnalytics(snapshot, new Date());
  const filteredWork = snapshot.workItems.filter((item) => !item.isDeleted && !item.isArchived
    && (activeSection === 'projects' ? item.type === 'project' : activeSection === 'assignments' ? item.type === 'assignment' : item.type === 'lab')
    && (statusFilter === 'all' || item.status === statusFilter || item.priority === statusFilter)
    && (subjectFilter === 'all' || item.subjectId === subjectFilter));
  const searchHits: SearchHit[] = searchQuery.trim() ? [
    ...snapshot.subjects.filter((entry) => !entry.isDeleted && `${entry.name} ${entry.code}`.toLowerCase().includes(searchQuery.toLowerCase())).map((entry) => ({ id: entry.id, title: entry.name, subtitle: entry.code, href: '/subjects', icon: BookOpen })),
    ...snapshot.workItems.filter((entry) => !entry.isDeleted && entry.title.toLowerCase().includes(searchQuery.toLowerCase())).map((entry) => ({ id: entry.id, title: entry.title, subtitle: entry.type, href: `/projects/${entry.id}`, icon: FolderKanban })),
    ...snapshot.members.filter((entry) => !entry.isDeleted && entry.name.toLowerCase().includes(searchQuery.toLowerCase())).map((entry) => ({ id: entry.id, title: entry.name, subtitle: entry.academicRole || 'Teammate', href: '/team', icon: Users })),
    ...snapshot.tasks.filter((entry) => !entry.isDeleted && `${entry.title} ${entry.description}`.toLowerCase().includes(searchQuery.toLowerCase())).map((entry) => ({ id: entry.id, title: entry.title, subtitle: 'Task', href: `/projects/${entry.workItemId}`, icon: CheckSquare })),
    ...snapshot.documents.filter((entry) => !entry.isDeleted && entry.status === 'ready' && `${entry.displayName} ${entry.originalName}`.toLowerCase().includes(searchQuery.toLowerCase())).map((entry) => ({ id: entry.id, title: entry.displayName, subtitle: 'Document', href: '/vault', icon: FileText })),
    ...snapshot.templates.filter((entry) => !entry.isDeleted && entry.name.toLowerCase().includes(searchQuery.toLowerCase())).map((entry) => ({ id: entry.id, title: entry.name, subtitle: 'Template', href: '/templates', icon: ListTodo })),
  ].slice(0, 8) : [];

  const openSubjectWork = (id: string) => { setSubjectFilter(id); setStatusFilter('all'); navigate('/projects'); };

  return <>
    <Shell snapshot={snapshot} section={activeSection} activeProjectCount={analytics.activeProjects} demo={demo} dark={dark} actorId={actorId}
      mobileNav={mobileNav} collapsed={sidebarCollapsed} searchOpen={searchOpen} searchQuery={searchQuery} searchHits={searchHits} notificationsOpen={notificationsOpen} quickOpen={quickOpen}
      setMobileNav={setMobileNav} onToggleNav={toggleSidebar} setDark={setDark} setActorId={setActorId} setSearchOpen={setSearchOpen} setSearchQuery={setSearchQuery}
      setNotificationsOpen={setNotificationsOpen} setQuickOpen={setQuickOpen} navigate={navigate} openModal={openModal}
      uploadFiles={async (files) => { await uploadFiles(files); }} currentTitle={selectedWork?.title} selectedWorkSubject={snapshot.subjects.find((subject) => subject.id === selectedWork?.subjectId)}>
      {activeSection === 'home' && <Dashboard snapshot={snapshot} analytics={analytics} onAdd={openModal} onNavigate={navigate} onSubjectOpen={openSubjectWork} />}

      {(activeSection === 'projects' || activeSection === 'assignments' || activeSection === 'labs') && (selectedWork
        ? <WorkDetail item={selectedWork} snapshot={snapshot} onBack={() => navigate(`/${selectedWork.type === 'project' ? 'projects' : selectedWork.type === 'assignment' ? 'assignments' : 'labs'}`)}
          onUpdate={updateWork} onEdit={() => openModal(selectedWork.type, selectedWork)} onTask={updateTask} onChecklist={updateChecklist}
          onAddChecklist={() => openModal('checklist', selectedWork)} onAddTask={() => openModal('task')} onDelete={() => void softDelete('work', selectedWork)}
          onUpload={async (files) => { await uploadFiles(files, selectedWork.type === 'lab' ? 'laboratory' : 'report'); }} />
        : <WorkPage section={activeSection} work={filteredWork} snapshot={snapshot} view={projectView} setView={setProjectView} filter={statusFilter} setFilter={setStatusFilter}
          subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter} actions={{ add: openModal, update: updateWork, open: (item) => navigate(`/projects/${item.id}`), remove: (kind, item) => void softDelete(kind, item) }} />)}

      {activeSection === 'subjects' && <SubjectsPage snapshot={snapshot} onAdd={() => openModal('subject')} onEdit={(subject) => openModal('subject', subject)} onDelete={(subject) => void softDelete('subject', subject)} onOpen={openSubjectWork} />}
      {activeSection === 'team' && <TeamPage snapshot={snapshot} onAdd={() => openModal('member')} onEdit={(member) => openModal('member', member)} onDelete={(member) => void softDelete('member', member)} />}
      {activeSection === 'vault' && <VaultPage snapshot={snapshot} actions={{ upload: async (files, category) => { await uploadFiles(files, category); }, download: downloadFile, preview: previewFile, replace: replaceFile, rename: renameFile, restore: restoreDocument, restoreVersion, remove: (doc) => void softDelete('document', doc) }} busy={busy} progress={uploadProgress} />}
      {activeSection === 'templates' && <TemplatesPage snapshot={snapshot} onAdd={() => openModal('template')} onDownload={(doc) => void downloadFile(doc)} onPreview={(doc) => void previewFile(doc)} onUse={(template) => void useTemplate(template)} onDelete={(template) => void softDelete('template', template)} />}
      {activeSection === 'checklists' && <ChecklistsPage snapshot={snapshot} onAdd={() => openModal('checklist')} onToggle={(checklist, items) => void updateChecklist(checklist, items)} />}
      {activeSection === 'calendar' && <CalendarPage snapshot={snapshot} onAddTask={() => openModal('task')} />}
      {activeSection === 'analytics' && <AnalyticsPage analytics={analytics} onNavigate={navigate} />}
      {activeSection === 'activity' && <ActivityPage snapshot={snapshot} onTask={updateTask} onAddTask={() => openModal('task')} />}
      {activeSection === 'archive' && <ArchivePage snapshot={snapshot} onRestoreSubject={(subject) => void restoreSubject(subject)} onRestoreWork={(item) => void restoreWork(item)} onRestoreDocument={(doc) => void restoreDocument(doc)} />}
      {activeSection === 'settings' && <SettingsPage snapshot={snapshot} demo={demo} busy={busy} actions={{ exportWorkspace, importWorkspace, resetDemo, clearWorkspace, updateSettings }} />}
    </Shell>

    {modal && <RecordForm kind={modal} target={modalTarget} snapshot={snapshot} busy={busy} onClose={closeModal} onSubmit={onSubmit} />}
    {pendingTemplate && <TemplateUploadModal name={pendingTemplate.name} busy={busy} onPick={(file) => { void attachTemplateFile(file); }} onClose={() => setPendingTemplate(null)} />}
    {toast && <div className="toast" role="status"><Check size={15} />{toast}</div>}
    <p className="global-disclaimer"><ShieldAlert size={12} /> Public shared workspace · reported teammate names are not verified identities</p>
    {!snapshot.members.length && <span className="sr-only">No teammates have been added yet.</span>}
    {!snapshot.documents.length && <span className="sr-only">The vault is empty.</span>}
  </>;
}

function TemplateUploadModal({ name, busy, onPick, onClose }: { name: string; busy: boolean; onPick: (file: File | null) => void; onClose: () => void }) {
  return <Modal eyebrow="ATTACH TEMPLATE FILE" title={name} onClose={onClose} footer={<><Button onClick={() => onPick(null)} disabled={busy}>Skip for now</Button><Button onClick={onClose} disabled={busy}>Close</Button></>}>
    <div className="template-upload-prompt"><CloudUpload size={22} /><p>Add the reusable college file now. You can replace it later from the Cloud Vault.</p><label className="btn btn-primary"><CloudUpload size={15} />Choose template file<input type="file" hidden disabled={busy} onChange={(event) => onPick(event.target.files?.[0] ?? null)} /></label>{busy && <small>Saving…</small>}</div>
  </Modal>;
}

export function EmptyWorkspaceNote() { return <EmptyState title="Workspace is ready" text="Add subjects and work to begin." />; }

import type { Checklist, DocumentRecord, DocumentVersion, Subject, Task, TeamMember, TemplateRecord, WorkItem, WorkspaceSettings } from '@shared/types';

export type Section = 'home' | 'projects' | 'assignments' | 'labs' | 'subjects' | 'team' | 'vault' | 'templates' | 'checklists' | 'calendar' | 'analytics' | 'archive' | 'settings' | 'activity';
export type ModalKind = 'project' | 'assignment' | 'lab' | 'subject' | 'member' | 'task' | 'template' | 'checklist' | null;
export type ModalTarget = Subject | WorkItem | TeamMember | null;
export type DeleteKind = 'subject' | 'work' | 'member' | 'template' | 'document';
export type WorkView = 'list' | 'board' | 'timeline' | 'calendar';

export interface WorkspaceActions {
  openModal: (kind: Exclude<ModalKind, null>, target?: ModalTarget) => void;
  navigate: (path: string) => void;
  updateWork: (item: WorkItem, patch: Partial<WorkItem>) => Promise<void>;
  updateTask: (task: Task, patch: Partial<Task>) => Promise<void>;
  updateChecklist: (checklist: Checklist, items: Checklist['items']) => Promise<void>;
  softDelete: (kind: DeleteKind, record: Subject | WorkItem | TeamMember | TemplateRecord | DocumentRecord) => void;
  uploadFiles: (files: FileList | File[] | null, category?: DocumentRecord['category']) => Promise<void>;
  downloadFile: (document: DocumentRecord) => Promise<void>;
  previewFile: (document: DocumentRecord) => Promise<void>;
  renameFile: (document: DocumentRecord) => Promise<void>;
  replaceFile: (document: DocumentRecord, file: File) => Promise<void>;
  restoreDocument: (document: DocumentRecord) => Promise<void>;
  restoreVersion: (document: DocumentRecord, version: DocumentVersion) => Promise<void>;
  restoreWork: (item: WorkItem) => Promise<void>;
  restoreSubject: (subject: Subject) => Promise<void>;
  exportWorkspace: () => Promise<void>;
  importWorkspace: (file: File) => Promise<void>;
  updateSettings: (patch: Partial<WorkspaceSettings>) => Promise<void>;
  resetDemo: () => Promise<void>;
  clearWorkspace: () => Promise<void>;
}

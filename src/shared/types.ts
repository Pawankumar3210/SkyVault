export const WORK_TYPES = ['project', 'assignment', 'lab'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const PROJECT_TYPES = ['group', 'individual'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DEFAULT_STATUSES = [
  'not_started',
  'in_progress',
  'under_review',
  'submitted',
  'completed',
] as const;
export type DefaultStatus = (typeof DEFAULT_STATUSES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const DOCUMENT_CATEGORIES = [
  'template',
  'report',
  'presentation',
  'assignment',
  'laboratory',
  'reference',
  'other',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const TEMPLATE_CATEGORIES = [
  'project_report',
  'project_presentation',
  'assignment',
  'laboratory_report',
  'research_paper',
  'other',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const DOCUMENT_STATUSES = ['pending', 'ready', 'failed'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  isDemo: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  done: boolean;
}

export interface WorkItem {
  id: string;
  title: string;
  type: WorkType;
  projectType: ProjectType | null;
  category: string;
  subjectId: string;
  description: string;
  instructions: string;
  status: string;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  teamMemberIds: string[];
  projectLeadId: string | null;
  tags: string[];
  progress: number;
  deliverables: string[];
  submissionFormat: string;
  notes: string;
  labNumber: string;
  experimentNumber: string;
  objective: string;
  requiredTools: string;
  milestones: Milestone[];
  isDemo: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentId: string;
  academicRole: string;
  skills: string[];
  notes: string;
  isDemo: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  workItemId: string;
  assignedMemberId: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  isDemo: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  displayName: string;
  originalName: string;
  storageObjectPath: string;
  storageMode: 'indexeddb' | 'gcs';
  subjectId: string | null;
  workItemId: string | null;
  templateId: string | null;
  category: DocumentCategory;
  mimeType: string;
  sizeBytes: number;
  version: number;
  uploadedByLabel: string;
  uploadedByMemberId: string | null;
  tags: string[];
  description: string;
  status: DocumentStatus;
  pendingPath: string | null;
  pendingOriginalName: string | null;
  pendingMimeType: string | null;
  pendingSizeBytes: number | null;
  lastAccessedAt: string | null;
  isDemo: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  storageObjectPath: string;
  sizeBytes: number;
  mimeType: string;
  originalName: string;
  uploadedByLabel: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  group: string;
}

export interface Checklist {
  id: string;
  workItemId: string | null;
  templateId: string | null;
  title: string;
  items: ChecklistItem[];
  isDemo: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRecord {
  id: string;
  name: string;
  subjectId: string | null;
  templateCategory: TemplateCategory;
  documentId: string | null;
  description: string;
  source: string;
  versionLabel: string;
  instructions: string;
  isOfficial: boolean;
  checklistItems: ChecklistItem[];
  isDemo: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ActivityEvent =
  | 'project_created'
  | 'project_edited'
  | 'task_created'
  | 'task_assigned'
  | 'status_updated'
  | 'assignment_submitted'
  | 'document_uploaded'
  | 'document_deleted'
  | 'document_replaced'
  | 'template_added'
  | 'deadline_changed'
  | 'teammate_added'
  | 'teammate_removed'
  | 'subject_created'
  | 'checklist_updated'
  | 'workspace_imported';

export interface Activity {
  id: string;
  eventType: ActivityEvent;
  description: string;
  actorMemberId: string | null;
  actorDisplayName: string;
  identityVerified: false;
  relatedEntityType: string;
  relatedEntityId: string;
  relatedSubjectId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'watch' | 'attention';
  href: string;
  dedupeKey: string;
  readAt: string | null;
  createdAt: string;
}

export interface StatusOption {
  id: string;
  label: string;
}

export interface WorkspaceSettings {
  id: 'workspace';
  semesterName: string;
  semesterSubtitle: string;
  timezone: 'Asia/Kolkata';
  maxFileSizeMb: number;
  storageSoftLimitMb: number;
  uploadWarningPercentage: number;
  maxRetainedVersions: number;
  projectCategories: string[];
  statuses: StatusOption[];
  roles: string[];
  showActorDisclaimer: boolean;
  updatedAt: string;
}

export interface ActorContext {
  memberId: string | null;
  displayName: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkspaceSnapshot {
  subjects: Subject[];
  workItems: WorkItem[];
  tasks: Task[];
  members: TeamMember[];
  documents: DocumentRecord[];
  versions: DocumentVersion[];
  templates: TemplateRecord[];
  checklists: Checklist[];
  activities: Activity[];
  notifications: AppNotification[];
  settings: WorkspaceSettings;
}

export interface WorkspaceBackup {
  id: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  snapshot: WorkspaceSnapshot;
}

export interface SearchHit {
  id: string;
  type: 'subject' | 'project' | 'assignment' | 'lab' | 'member' | 'task' | 'document' | 'template';
  title: string;
  subtitle: string;
  href: string;
}

export interface StorageSummary {
  fileCount: number;
  totalBytes: number;
  softLimitBytes: number;
  warningBytes: number;
  byCategory: { category: DocumentCategory; count: number; bytes: number }[];
}

export interface Insight {
  id: string;
  level: 'info' | 'watch' | 'attention';
  title: string;
  detail: string;
}

export interface AnalyticsSummary {
  activeProjects: number;
  pendingAssignments: number;
  activeLabs: number;
  upcomingDeadlines: number;
  completedWork: number;
  overdueItems: number;
  totalProjects: number;
  completedProjects: number;
  inProgressProjects: number;
  completedAssignments: number;
  submissionCompletionRate: number;
  radar: Record<'today' | 'three' | 'seven' | 'overdue' | 'completed', number>;
  workloadBySubject: {
    subjectId: string;
    name: string;
    code: string;
    color: string;
    projects: number;
    assignments: number;
    labs: number;
    total: number;
    progress: number;
  }[];
  statusDistribution: { status: string; label: string; count: number }[];
  priorityDistribution: { priority: Priority; count: number }[];
  completionTrend: { week: string; completed: number; created: number }[];
  tasksByMember: {
    memberId: string;
    name: string;
    assigned: number;
    completed: number;
    pending: number;
    overdue: number;
  }[];
  deadlinesByWeek: { week: string; count: number }[];
  insights: Insight[];
  storage: StorageSummary;
}

export interface WorkspaceExport {
  format: 'sky-vault-workspace';
  version: 1;
  exportedAt: string;
  note: string;
  subjects: Subject[];
  workItems: WorkItem[];
  tasks: Task[];
  members: TeamMember[];
  documents: DocumentRecord[];
  versions: DocumentVersion[];
  templates: TemplateRecord[];
  checklists: Checklist[];
  activities: Activity[];
  settings: WorkspaceSettings;
}

export interface SeedFile {
  id: string;
  document: DocumentRecord;
  version?: DocumentVersion;
  bytes: Uint8Array;
}

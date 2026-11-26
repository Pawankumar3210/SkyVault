import type { DocumentCategory, Priority, StatusOption, TemplateCategory } from './types';

export const TIMEZONE = 'Asia/Kolkata' as const;
export const WORKSPACE_ID = 'workspace';
export const SEMESTER_NAME = 'Semester 5';

export const COLLECTION = {
  subjects: 'subjects',
  workItems: 'workItems',
  tasks: 'tasks',
  teamMembers: 'teamMembers',
  documents: 'documents',
  versions: 'documentVersions',
  templates: 'templates',
  activities: 'activities',
  notifications: 'notifications',
  checklists: 'checklists',
  settings: 'settings',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  under_review: 'Under review',
  submitted: 'Submitted',
  completed: 'Completed',
  todo: 'To do',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  template: 'College templates',
  report: 'Project reports',
  presentation: 'Presentations',
  assignment: 'Assignments',
  laboratory: 'Lab documentation',
  reference: 'Reference materials',
  other: 'Other documents',
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  project_report: 'Project report templates',
  project_presentation: 'Project presentation templates',
  assignment: 'Assignment templates',
  laboratory_report: 'Laboratory report templates',
  research_paper: 'Research paper templates',
  other: 'Other academic templates',
};

export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { id: 'not_started', label: 'Not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'under_review', label: 'Under review' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'completed', label: 'Completed' },
];

export const DEFAULT_CATEGORIES = [
  'Web Development',
  'Cloud Computing',
  'Machine Learning',
  'Big Data',
  'Software Engineering',
  'Research',
  'Other',
];

export const DEFAULT_ROLES = [
  'Team Leader',
  'Backend Developer',
  'Frontend Developer',
  'Cloud Engineer',
  'Research Lead',
  'Documentation Lead',
  'Tester',
  'Presenter',
  'Contributor',
];

export const TERMINAL_STATUSES = new Set(['submitted', 'completed']);

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'xlsx',
  'xls',
  'csv',
  'txt',
  'png',
  'jpg',
  'jpeg',
  'zip',
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const MIME_BY_EXTENSION: Record<AllowedExtension, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  doc: ['application/msword'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ppt: ['application/vnd.ms-powerpoint'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  csv: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  txt: ['text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  zip: ['application/zip', 'application/x-zip-compressed'],
};

export const PAGE_SIZE = 12;
export const QUERY_CAP = 1000;
export const ACTOR_NOTE =
  'Actor names are chosen in the workspace and are not a verified identity. Sky Vault has no login.';

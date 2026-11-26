import { z } from 'zod';
import {
  DOCUMENT_CATEGORIES,
  PRIORITIES,
  PROJECT_TYPES,
  TASK_STATUSES,
  TEMPLATE_CATEGORIES,
  WORK_TYPES,
} from './types';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/, 'Use a short identifier without spaces.');
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.');
const shortText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const tags = z.array(z.string().trim().min(1).max(40)).max(12);

export const SubjectInputSchema = z.object({
  name: shortText(120),
  code: shortText(16),
  description: optionalText(2000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Choose a hex color.'),
});

export const WorkItemInputSchema = z.object({
  title: shortText(160),
  type: z.enum(WORK_TYPES),
  projectType: z.enum(PROJECT_TYPES).nullable().optional(),
  category: optionalText(80).optional(),
  subjectId: id,
  description: optionalText(8000).optional(),
  instructions: optionalText(8000).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  priority: z.enum(PRIORITIES).optional(),
  startDate: dateKey.nullable().optional(),
  dueDate: dateKey.nullable().optional(),
  teamMemberIds: z.array(id).max(40).optional(),
  projectLeadId: id.nullable().optional(),
  tags: tags.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deliverables: z.array(z.string().trim().min(1).max(160)).max(40).optional(),
  submissionFormat: optionalText(160).optional(),
  notes: optionalText(4000).optional(),
  labNumber: optionalText(40).optional(),
  experimentNumber: optionalText(40).optional(),
  objective: optionalText(4000).optional(),
  requiredTools: optionalText(1000).optional(),
  milestones: z
    .array(
      z.object({
        id: id.optional(),
        title: shortText(120),
        date: dateKey,
        done: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
});

export const TaskInputSchema = z.object({
  title: shortText(160),
  description: optionalText(4000).optional(),
  workItemId: id,
  assignedMemberId: id.nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: dateKey.nullable().optional(),
});

export const MemberInputSchema = z.object({
  name: shortText(120),
  email: z.union([z.literal(''), z.string().trim().email().max(160)]).optional(),
  phone: optionalText(30).optional(),
  studentId: optionalText(40).optional(),
  academicRole: optionalText(80).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  notes: optionalText(2000).optional(),
});

export const DocumentMetaSchema = z.object({
  displayName: shortText(160),
  originalName: shortText(180),
  subjectId: id.nullable().optional(),
  workItemId: id.nullable().optional(),
  category: z.enum(DOCUMENT_CATEGORIES),
  mimeType: z.string().trim().max(120).optional(),
  sizeBytes: z.number().int().positive(),
  tags: tags.optional(),
  description: optionalText(2000).optional(),
  headerBase64: z.string().max(256).optional(),
});

export const TemplateInputSchema = z.object({
  name: shortText(160),
  subjectId: id.nullable().optional(),
  templateCategory: z.enum(TEMPLATE_CATEGORIES),
  description: optionalText(2000).optional(),
  source: optionalText(160).optional(),
  versionLabel: optionalText(40).optional(),
  instructions: optionalText(4000).optional(),
  isOfficial: z.boolean().optional(),
  checklistItems: z
    .array(
      z.object({
        id: id.optional(),
        label: shortText(160),
        done: z.boolean().optional(),
        group: optionalText(80).optional(),
      }),
    )
    .max(80)
    .optional(),
  documentId: id.nullable().optional(),
});

export const ChecklistInputSchema = z.object({
  workItemId: id.nullable().optional(),
  templateId: id.nullable().optional(),
  title: shortText(160),
  items: z
    .array(
      z.object({
        id: id.optional(),
        label: shortText(160),
        done: z.boolean().optional(),
        group: optionalText(80).optional(),
      }),
    )
    .min(1)
    .max(80),
});

export const SettingsPatchSchema = z.object({
  semesterName: shortText(80).optional(),
  semesterSubtitle: shortText(160).optional(),
  maxFileSizeMb: z.number().positive().max(25).optional(),
  storageSoftLimitMb: z.number().positive().max(5000).optional(),
  uploadWarningPercentage: z.number().int().min(50).max(95).optional(),
  maxRetainedVersions: z.number().int().min(1).max(10).optional(),
  projectCategories: z.array(shortText(80)).min(1).max(20).optional(),
  statuses: z
    .array(z.object({ id: z.string().regex(/^[a-z0-9_-]{1,40}$/), label: shortText(40) }))
    .min(2)
    .max(12)
    .optional(),
  roles: z.array(shortText(80)).min(1).max(24).optional(),
  showActorDisclaimer: z.boolean().optional(),
});

export const ActorSchema = z.object({
  memberId: id.nullable().optional(),
  displayName: z.string().trim().max(120).optional(),
});

export const WorkItemPatchSchema = WorkItemInputSchema.partial();
export const TaskPatchSchema = TaskInputSchema.partial();
export const MemberPatchSchema = MemberInputSchema.partial();
export const SubjectPatchSchema = SubjectInputSchema.partial();
export const TemplatePatchSchema = TemplateInputSchema.partial();
export const ChecklistPatchSchema = ChecklistInputSchema.partial();

export type SubjectInput = z.infer<typeof SubjectInputSchema>;
export type WorkItemInput = z.infer<typeof WorkItemInputSchema>;
export type TaskInput = z.infer<typeof TaskInputSchema>;
export type MemberInput = z.infer<typeof MemberInputSchema>;
export type DocumentMetaInput = z.infer<typeof DocumentMetaSchema>;
export type TemplateInput = z.infer<typeof TemplateInputSchema>;
export type ChecklistInput = z.infer<typeof ChecklistInputSchema>;
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

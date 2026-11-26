import type { FormEvent, ReactNode } from 'react';
import { TERMINAL_STATUSES } from '@shared/constants';
import type { ModalTarget, ModalKind } from '../contracts';
import type { Subject, TeamMember, WorkItem, WorkspaceSnapshot } from '@shared/types';
import { Button, Modal } from './ui';

type Kind = Exclude<ModalKind, null>;

interface FormProps {
  kind: Kind;
  target: ModalTarget;
  snapshot: WorkspaceSnapshot;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function RecordForm({ kind, target, snapshot, busy, onClose, onSubmit }: FormProps) {
  const work = target && 'type' in target ? target as WorkItem : null;
  const member = target && 'email' in target ? target as TeamMember : null;
  const subject = target && 'color' in target ? target as Subject : null;
  const title = kind === 'subject' ? subject ? 'Edit subject' : 'Add subject'
    : kind === 'project' ? 'Create project' : kind === 'assignment' ? 'Add assignment' : kind === 'lab' ? 'Log lab activity'
      : kind === 'member' ? 'Add teammate' : kind === 'task' ? 'Create team task' : kind === 'template' ? 'Add template' : 'Create checklist';
  const subjects = snapshot.subjects.filter((entry) => !entry.isDeleted);
  const members = snapshot.members.filter((entry) => !entry.isDeleted);

  return <Modal
    title={title}
    onClose={onClose}
    wide={kind === 'project' || kind === 'assignment' || kind === 'lab'}
    footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" form="record-form" disabled={busy}>{busy ? 'Saving…' : subject && kind === 'subject' ? 'Save changes' : title}</Button></>}
  >
    <form id="record-form" className="record-form" onSubmit={onSubmit}>
      {kind === 'subject' && <>
        <div className="form-row"><Input name="name" label="Subject name" required placeholder="e.g. Cloud Computing" defaultValue={subject?.name} /><Input name="code" label="Subject code" required maxLength={16} placeholder="e.g. CCT" defaultValue={subject?.code} /></div>
        <Input name="description" label="Description" placeholder="What does this subject cover?" defaultValue={subject?.description} />
        <label className="field field-color"><span>Subject colour</span><input name="color" type="color" defaultValue={subject?.color ?? '#47C9FF'} /></label>
      </>}

      {(kind === 'project' || kind === 'assignment' || kind === 'lab') && <>
        <div className="form-row"><Input name="title" label="Title" required placeholder={kind === 'project' ? 'e.g. Smart campus resource planner' : kind === 'lab' ? 'e.g. Configure a private storage bucket' : 'e.g. Cloud architecture report'} defaultValue={work?.title} />
          <Select name="subjectId" label="Subject" required defaultValue={work?.subjectId ?? ''}><option value="" disabled>Select a subject</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></div>
        <div className="form-row"><Select name="status" label="Status" defaultValue={work?.status ?? 'not_started'}>{snapshot.settings.statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</Select>
          <Select name="priority" label="Priority" defaultValue={work?.priority ?? 'medium'}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select></div>
        <div className="form-row"><Input name="startDate" label="Start date" type="date" defaultValue={work?.startDate ?? ''} /><Input name="dueDate" label="Due date" type="date" defaultValue={work?.dueDate ?? ''} /></div>
        {kind === 'project' && <div className="form-row"><Select name="projectType" label="Project type" defaultValue={work?.projectType ?? 'group'}><option value="group">Group project</option><option value="individual">Individual project</option></Select><Input name="category" label="Category" placeholder="e.g. Cloud Computing" defaultValue={work?.category} /></div>}
        {kind === 'lab' && <div className="form-row"><Input name="labNumber" label="Lab number" placeholder="e.g. 04" defaultValue={work?.labNumber} /><Input name="experimentNumber" label="Experiment number" placeholder="e.g. 02" defaultValue={work?.experimentNumber} /></div>}
        <Input name="description" label="Description" placeholder="A short summary of the expected work" defaultValue={work?.description} />
        {kind === 'assignment' && <><Input name="instructions" label="Instructions" placeholder="Faculty instructions or submission requirements" defaultValue={work?.instructions} /><Input name="format" label="Submission format" placeholder="PDF, report, notebook…" defaultValue={work?.submissionFormat} /></>}
        {kind === 'lab' && <><Input name="objective" label="Objective" placeholder="What should the experiment demonstrate?" defaultValue={work?.objective} /><Input name="requiredTools" label="Required tools" placeholder="Software, equipment, or cloud services" defaultValue={work?.requiredTools} /></>}
        {kind === 'project' && <>
          <Input name="tags" label="Tags" placeholder="Separate tags with commas" defaultValue={work?.tags.join(', ')} />
          <fieldset className="field member-picker"><legend>Team members</legend><div className="member-options">{members.length ? members.map((item) => <label key={item.id}><input type="checkbox" name="teamMemberIds" value={item.id} defaultChecked={work?.teamMemberIds.includes(item.id) ?? false} />{item.name}</label>) : <small>No teammates yet. Add them from the Team directory.</small>}</div></fieldset>
          <Select name="projectLeadId" label="Project lead" defaultValue={work?.projectLeadId ?? ''}><option value="">Not assigned</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        </>}
      </>}

      {kind === 'member' && <>
        <Input name="name" label="Name" required placeholder="Teammate name" defaultValue={member?.name} />
        <div className="form-row"><Input name="email" label="Email" type="email" placeholder="student@example.edu" defaultValue={member?.email} /><Input name="academicRole" label="Academic role" placeholder="e.g. Documentation lead" defaultValue={member?.academicRole} /></div>
        <Input name="skills" label="Skills" placeholder="Separate skills with commas" defaultValue={member?.skills.join(', ')} />
        <Input name="notes" label="Notes" placeholder="Optional context about this teammate" defaultValue={member?.notes} />
      </>}

      {kind === 'task' && <>
        <Input name="title" label="Task title" required placeholder="e.g. Draft the system architecture" />
        <Select name="workItemId" label="Related work" required defaultValue=""><option value="" disabled>Select a project or academic item</option>{snapshot.workItems.filter((item) => !item.isDeleted && !TERMINAL_STATUSES.has(item.status)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select>
        <div className="form-row"><Select name="assignedMemberId" label="Assign to" defaultValue=""><option value="">Unassigned</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Input name="dueDate" label="Due date" type="date" /></div>
        <div className="form-row"><Select name="priority" label="Priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select><Input name="description" label="Task notes" placeholder="Optional task details" /></div>
      </>}

      {kind === 'template' && <>
        <Input name="name" label="Template name" required placeholder="e.g. Project report format" />
        <div className="form-row"><Select name="templateCategory" label="Category" defaultValue="project_report"><option value="project_report">Project report</option><option value="project_presentation">Project presentation</option><option value="assignment">Assignment</option><option value="laboratory_report">Laboratory report</option><option value="research_paper">Research paper</option><option value="other">Other</option></Select>
          <Select name="subjectId" label="Subject" defaultValue=""><option value="">All subjects</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select></div>
        <Input name="source" label="Source / faculty" placeholder="e.g. Department of Computer Science" />
        <div className="form-row"><Input name="versionLabel" label="Version" defaultValue="1" /><label className="field field-check"><input name="isOfficial" type="checkbox" /><span>Official college template</span></label></div>
        <Input name="description" label="Description" placeholder="What this template is for" />
        <Input name="instructions" label="Instructions" placeholder="How should students use this template?" />
        <label className="field"><span>Checklist items <small>(one per line)</small></span><textarea name="checklistItems" rows={4} placeholder={'Cover page\nTable of contents\nReferences'} /></label>
      </>}

      {kind === 'checklist' && <>
        <Input name="title" label="Checklist title" required placeholder="e.g. Report submission review" />
        <Select name="workItemId" label="Related work" defaultValue={work?.id ?? ''}><option value="">General checklist</option>{snapshot.workItems.filter((item) => !item.isDeleted).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select>
        <label className="field"><span>Checklist items <small>(one per line)</small></span><textarea name="items" rows={6} required placeholder={'Check report template\nReview references\nExport as PDF\nConfirm submission'} /></label>
      </>}
    </form>
  </Modal>;
}

function Input({ name, label, required, type = 'text', placeholder, defaultValue, maxLength }: { name: string; label: string; required?: boolean; type?: string; placeholder?: string; defaultValue?: string; maxLength?: number }) {
  return <label className="field"><span>{label}{required && <i> *</i>}</span><input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} maxLength={maxLength} /></label>;
}

function Select({ name, label, required, defaultValue, children }: { name: string; label: string; required?: boolean; defaultValue?: string; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <i> *</i>}</span><select name={name} required={required} defaultValue={defaultValue}>{children}</select></label>;
}

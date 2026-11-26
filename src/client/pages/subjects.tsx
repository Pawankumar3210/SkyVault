import type { CSSProperties } from 'react';
import { ArrowUpRight, BookOpen, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { TERMINAL_STATUSES } from '@shared/constants';
import type { Subject, WorkspaceSnapshot } from '@shared/types';
import { Button, EmptyState, Eyebrow, IconButton, Panel, PanelHead, Progress } from '../components/ui';

export function SubjectsPage({ snapshot, onAdd, onEdit, onDelete, onOpen }: { snapshot: WorkspaceSnapshot; onAdd: () => void; onEdit: (subject: Subject) => void; onDelete: (subject: Subject) => void; onOpen: (id: string) => void }) {
  const subjects = snapshot.subjects.filter((subject) => !subject.isDeleted && !subject.isArchived);
  return <>
    <header className="page-heading"><div><Eyebrow>SEMESTER 5 CURRICULUM</Eyebrow><h1>Subjects</h1><p>Every course in one place, with its work, documents and deadlines.</p></div><div className="heading-actions"><Button variant="primary" icon={Plus} onClick={onAdd}>Add subject</Button></div></header>
    <div className="card-grid subject-cards">{subjects.map((subject) => {
      const own = snapshot.workItems.filter((item) => item.subjectId === subject.id && !item.isDeleted);
      const active = own.filter((item) => !TERMINAL_STATUSES.has(item.status)).length;
      const progress = own.length ? Math.round(own.reduce((sum, item) => sum + item.progress, 0) / own.length) : 0;
      const documents = snapshot.documents.filter((doc) => doc.subjectId === subject.id && !doc.isDeleted && doc.status === 'ready').length;
      return <article className="subject-card" key={subject.id} style={{ '--subject': subject.color } as CSSProperties}>
        <div className="subject-card-head"><span className="subject-badge"><BookOpen size={19} /></span><div className="subject-card-tools"><IconButton label={`Edit ${subject.name}`} icon={MoreHorizontal} className="tiny" onClick={() => onEdit(subject)} /><IconButton label={`Archive ${subject.name}`} icon={Trash2} className="tiny danger" onClick={() => onDelete(subject)} /></div></div>
        <span className="mono-label">{subject.code}</span><h2>{subject.name}</h2><p>{subject.description || 'No description added yet.'}</p>
        <div className="subject-metrics"><span><b>{own.filter((item) => item.type === 'project').length}</b> projects</span><span><b>{own.filter((item) => item.type === 'assignment').length}</b> assignments</span><span><b>{active}</b> active</span><span><b>{documents}</b> files</span></div>
        <div className="subject-progress-label"><small>Progress</small><b>{progress}%</b></div><Progress value={progress} color={subject.color} />
        <button className="subject-open" onClick={() => onOpen(subject.id)}>Open workspace <ArrowUpRight size={14} /></button>
      </article>;
    })}</div>
    {!subjects.length && <Panel><EmptyState title="Your semester starts here" text="Add the subjects you are taking this semester." action={<Button variant="primary" icon={Plus} onClick={onAdd}>Add a subject</Button>} /></Panel>}
    <p className="identity-note">Subjects are editable records. Removing one moves it to the archive so it can be restored.</p>
  </>;
}

export function SubjectWorkPanel({ snapshot, subjectId }: { snapshot: WorkspaceSnapshot; subjectId: string }) {
  const subject = snapshot.subjects.find((entry) => entry.id === subjectId);
  if (!subject) return null;
  const own = snapshot.workItems.filter((item) => item.subjectId === subjectId && !item.isDeleted);
  const documents = snapshot.documents.filter((doc) => doc.subjectId === subjectId && !doc.isDeleted && doc.status === 'ready');
  const activity = snapshot.activities.filter((record) => record.relatedSubjectId === subjectId).slice(0, 6);
  return <Panel><PanelHead title={`${subject.code} workspace`} subtitle={`${own.length} academic items · ${documents.length} documents`} /><div className="subject-work-summary">{own.map((item) => <div className="check-line" key={item.id}><BookOpen size={14} /><span>{item.title}</span><small>{item.status.replaceAll('_', ' ')}</small></div>)}{!own.length && <EmptyState title="No work in this subject" text="Create projects, assignments or labs for this subject." />}</div>{activity.length > 0 && <><h3 className="subhead">Activity</h3><div className="subject-work-summary">{activity.map((record) => <div className="check-line" key={record.id}><BookOpen size={14} /><span>{record.description}</span><small>{new Date(record.createdAt).toLocaleDateString('en-IN')}</small></div>)}</div></>}</Panel>;
}

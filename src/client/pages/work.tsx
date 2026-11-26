import { useState, type CSSProperties } from 'react';
import { Activity, ArrowLeft, ArrowUpRight, CalendarDays, Check, CheckSquare, CloudUpload, FileText, FolderKanban, Plus, Trash2, Users, Zap, type LucideIcon } from 'lucide-react';
import { DEFAULT_STATUS_OPTIONS, TERMINAL_STATUSES } from '@shared/constants';
import { formatDateKey } from '@shared/dates';
import { formatBytes } from '@shared/files';
import type { Checklist, Task, WorkspaceSnapshot, WorkItem } from '@shared/types';
import type { DeleteKind, ModalKind, WorkView } from '../contracts';
import { dueLabel, dueTone, humanStatus } from '../lib/format';
import { Avatar, Badge, Button, EmptyState, Eyebrow, IconButton, Panel, PanelHead, PriorityPill, Progress, StatusPill } from '../components/ui';
import { ActivityFeed } from './dashboard';

interface WorkPageProps {
  section: 'projects' | 'assignments' | 'labs';
  work: WorkItem[];
  snapshot: WorkspaceSnapshot;
  view: WorkView;
  setView: (view: WorkView) => void;
  filter: string;
  setFilter: (value: string) => void;
  subjectFilter: string;
  setSubjectFilter: (value: string) => void;
  actions: {
    add: (kind: Exclude<ModalKind, null>) => void;
    update: (item: WorkItem, patch: Partial<WorkItem>) => Promise<void>;
    open: (item: WorkItem) => void;
    remove: (kind: DeleteKind, item: WorkItem) => void;
  };
}

export function WorkPage({ section, work, snapshot, view, setView, filter, setFilter, subjectFilter, setSubjectFilter, actions }: WorkPageProps) {
  const kind = section === 'projects' ? 'project' : section === 'assignments' ? 'assignment' : 'lab';
  const title = section === 'projects' ? 'Projects' : section === 'assignments' ? 'Assignments' : 'Laboratory';
  const description = section === 'projects' ? 'Group and individual work, from kickoff to submission.' : section === 'assignments' ? 'Coursework, reports and faculty submission dates.' : 'Experiments, practicals and laboratory documentation.';
  const statuses = snapshot.settings.statuses.length ? snapshot.settings.statuses : DEFAULT_STATUS_OPTIONS;

  return <>
    <header className="page-heading"><div><Eyebrow>SEMESTER 5 WORKSPACE</Eyebrow><h1>{title}</h1><p>{description}</p></div><div className="heading-actions"><Button variant="primary" icon={Plus} onClick={() => actions.add(kind)}>New {kind}</Button></div></header>

    <div className="summary-strip">
      <div className="summary-strip-lead"><span className="summary-icon"><FolderKanban size={17} /></span><span><small>Showing records</small><b>{work.length} {title.toLowerCase()}</b></span></div>
      <div className="summary-stats"><span><b>{work.filter((item) => !TERMINAL_STATUSES.has(item.status)).length}</b><small>Active</small></span><span><b>{work.filter((item) => item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10) && !TERMINAL_STATUSES.has(item.status)).length}</b><small>Overdue</small></span><span><b>{work.filter((item) => TERMINAL_STATUSES.has(item.status)).length}</b><small>Complete</small></span></div>
    </div>

    <Panel className="work-panel">
      <div className="work-toolbar">
        <div className="view-switch" role="tablist" aria-label="Work views">{(['list', 'board', 'timeline', 'calendar'] as const).map((option) => <button role="tab" aria-selected={view === option} className={view === option ? 'is-active' : ''} key={option} onClick={() => setView(option)}>{option === 'board' ? 'Board' : humanStatus(option)}</button>)}</div>
        <div className="toolbar-filters"><label className="filter-select"><select aria-label="Filter by status" value={filter === 'all' || snapshot.settings.statuses.some((status) => status.id === filter) ? filter : 'all'} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option>{statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
          <label className="filter-select"><select aria-label="Filter by subject" value={snapshot.subjects.some((subject) => subject.id === subjectFilter) ? subjectFilter : 'all'} onChange={(event) => setSubjectFilter(event.target.value)}><option value="all">All subjects</option>{snapshot.subjects.filter((subject) => !subject.isDeleted).map((subject) => <option key={subject.id} value={subject.id}>{subject.code}</option>)}</select></label></div>
      </div>

      {view === 'list' && <div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Subject</th><th>Status</th><th>Priority</th><th>Due</th><th>Progress</th><th aria-label="Actions" /></tr></thead><tbody>{work.map((item) => <WorkRow key={item.id} item={item} snapshot={snapshot} onOpen={() => actions.open(item)} onUpdate={(patch) => void actions.update(item, patch)} onDelete={() => actions.remove('work', item)} />)}</tbody></table>{!work.length && <EmptyState title="Nothing here yet" text={`Create your first ${kind} to begin tracking this semester.`} action={<Button variant="primary" icon={Plus} onClick={() => actions.add(kind)}>Add {kind}</Button>} />}</div>}

      {view === 'board' && <div className="kanban-board">{statuses.map((status) => {
        const rows = work.filter((item) => item.status === status.id);
        return <div className="kanban-column" key={status.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData('text/sky-work'); const item = work.find((row) => row.id === id); if (item && item.status !== status.id) void actions.update(item, { status: status.id }); }}>
          <div className="kanban-head"><span className={`status-tick status-${status.id}`} /><b>{status.label}</b><em>{rows.length}</em><IconButton label={`Add ${status.label} item`} icon={Plus} onClick={() => actions.add(kind)} /></div>
          <div className="kanban-stack">{rows.map((item) => <article className="kanban-card" draggable key={item.id} onDragStart={(event) => event.dataTransfer.setData('text/sky-work', item.id)}>
            <div className="kanban-card-top"><PriorityPill priority={item.priority} /><IconButton label={`Delete ${item.title}`} icon={Trash2} onClick={() => actions.remove('work', item)} className="tiny" /></div>
            <button className="record-link" onClick={() => actions.open(item)}>{item.title}</button>
            <small>{snapshot.subjects.find((subject) => subject.id === item.subjectId)?.code ?? 'Semester 5'} · {humanStatus(item.type)}</small>
            <Progress value={item.progress} />
            <div className="kanban-foot"><span><Users size={12} /> {item.teamMemberIds.length}</span><span className={dueTone(item.dueDate, item.status)}>{dueLabel(item.dueDate, item.status)}</span></div>
          </article>)}{!rows.length && <p className="kanban-empty">Drop work here</p>}</div>
        </div>;
      })}</div>}

      {view === 'timeline' && <div className="timeline-view">{work.slice().sort((a, b) => (a.startDate ?? a.dueDate ?? '').localeCompare(b.startDate ?? b.dueDate ?? '')).map((item) => {
        const start = item.startDate ?? item.createdAt.slice(0, 10);
        const end = item.dueDate ?? start;
        const left = Math.max(0, Math.min(72, (Date.parse(`${start}T00:00:00`) - Date.now()) / 691_200_000 + 10));
        const width = Math.max(9, Math.min(88 - left, (Date.parse(`${end}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 691_200_000));
        return <div className="timeline-row" key={item.id}><button className="record-link timeline-label" onClick={() => actions.open(item)}>{item.title}</button><div className="timeline-track"><button className="timeline-bar" style={{ left: `${left}%`, width: `${width}%`, '--bar': snapshot.subjects.find((subject) => subject.id === item.subjectId)?.color ?? 'var(--accent)' } as CSSProperties} onClick={() => actions.open(item)} title={`${item.title}: ${start} to ${end}`}><span>{item.progress}%</span></button></div><small>{item.dueDate ? formatDateKey(item.dueDate) : 'Unscheduled'}</small></div>;
      })}{!work.length && <EmptyState title="No timeline entries" text="Add start and due dates to plot your semester." />}</div>}

      {view === 'calendar' && <div className="calendar-list-view">{work.filter((item) => item.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)).map((item) => <div className="agenda-item" key={item.id}><span className="agenda-date"><b>{item.dueDate?.slice(8)}</b><small>{formatDateKey(item.dueDate!).split(' ')[1]}</small></span><button className="record-link" onClick={() => actions.open(item)}>{item.title}</button><span>{snapshot.subjects.find((subject) => subject.id === item.subjectId)?.code ?? 'S5'}</span><span className={dueTone(item.dueDate, item.status)}>{dueLabel(item.dueDate, item.status)}</span></div>)}{work.every((item) => !item.dueDate) && <EmptyState title="No dated work" text="Add due dates to see this view organized by schedule." />}</div>}
    </Panel>
  </>;
}

function WorkRow({ item, snapshot, onOpen, onUpdate, onDelete }: { item: WorkItem; snapshot: WorkspaceSnapshot; onOpen: () => void; onUpdate: (patch: Partial<WorkItem>) => void; onDelete: () => void }) {
  const subject = snapshot.subjects.find((entry) => entry.id === item.subjectId);
  return <tr className="data-row" onClick={(event) => { if (!(event.target as HTMLElement).closest('button, select, a, label, input')) onOpen(); }}>
    <td><button className="name-cell" onClick={onOpen}><span className="type-icon" style={{ '--subject': subject?.color } as CSSProperties}>{item.type === 'project' ? <FolderKanban size={16} /> : item.type === 'lab' ? <Zap size={16} /> : <CheckSquare size={16} />}</span><span><b>{item.title}</b><small>{item.category || humanStatus(item.type)}{item.projectType ? ` · ${humanStatus(item.projectType)}` : ''}</small></span></button></td>
    <td><span className="table-subject"><i style={{ background: subject?.color }} />{subject?.code ?? '—'}</span></td>
    <td><select className="status-select" aria-label={`Status for ${item.title}`} value={item.status} onChange={(event) => onUpdate({ status: event.target.value })}>{snapshot.settings.statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></td>
    <td><PriorityPill priority={item.priority} /></td>
    <td className={dueTone(item.dueDate, item.status)}>{item.dueDate ? formatDateKey(item.dueDate) : '—'}</td>
    <td><div className="inline-progress"><Progress value={item.progress} /><small>{item.progress}%</small></div></td>
    <td><div className="row-tools"><IconButton label={`Open ${item.title}`} icon={ArrowUpRight} className="tiny" onClick={onOpen} /><IconButton label={`Delete ${item.title}`} icon={Trash2} className="tiny danger" onClick={onDelete} /></div></td>
  </tr>;
}

interface DetailProps {
  item: WorkItem;
  snapshot: WorkspaceSnapshot;
  onBack: () => void;
  onUpdate: (item: WorkItem, patch: Partial<WorkItem>) => Promise<void>;
  onEdit: () => void;
  onTask: (task: Task, patch: Partial<Task>) => Promise<void>;
  onChecklist: (checklist: Checklist, items: Checklist['items']) => Promise<void>;
  onAddChecklist: () => void;
  onAddTask: () => void;
  onDelete: () => void;
  onUpload: (files: File[] | FileList | null) => Promise<void>;
}

export function WorkDetail({ item, snapshot, onBack, onUpdate, onEdit, onTask, onChecklist, onAddChecklist, onAddTask, onDelete, onUpload }: DetailProps) {
  const [tab, setTab] = useState('Overview');
  const subject = snapshot.subjects.find((entry) => entry.id === item.subjectId);
  const tasks = snapshot.tasks.filter((task) => task.workItemId === item.id && !task.isDeleted);
  const files = snapshot.documents.filter((doc) => doc.workItemId === item.id && !doc.isDeleted && doc.status === 'ready');
  const members = item.teamMemberIds.map((id) => snapshot.members.find((member) => member.id === id)).filter(Boolean) as NonNullable<ReturnType<typeof snapshot.members.find>>[];
  const checklists = snapshot.checklists.filter((list) => list.workItemId === item.id && !list.isDeleted);
  const tabs: { label: string; icon: LucideIcon; count?: number }[] = [
    { label: 'Overview', icon: FolderKanban }, { label: 'Tasks', icon: CheckSquare, count: tasks.length }, { label: 'Team', icon: Users, count: members.length },
    { label: 'Documents', icon: FileText, count: files.length }, { label: 'Deliverables', icon: Check }, { label: 'Activity', icon: Activity },
  ];

  return <>
    <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to {humanStatus(item.type)}s</button>
    <header className="detail-heading"><div className="detail-title"><span className="type-icon large" style={{ '--subject': subject?.color } as CSSProperties}>{item.type === 'project' ? <FolderKanban size={20} /> : item.type === 'lab' ? <Zap size={20} /> : <CheckSquare size={20} />}</span><div><Eyebrow>{subject?.code ?? 'SEMESTER 5'} · {humanStatus(item.type)}</Eyebrow><h1>{item.title}</h1></div></div>
      <div className="heading-actions"><Button icon={FolderKanban} onClick={onEdit}>Edit</Button><Button icon={Check} onClick={() => void onUpdate(item, { status: item.status === 'completed' ? 'in_progress' : 'completed' })}>{item.status === 'completed' ? 'Reopen' : 'Mark complete'}</Button><Button icon={Trash2} variant="danger" onClick={onDelete}>Delete</Button></div>
    </header>
    <div className="detail-badges"><StatusPill status={item.status} /><PriorityPill priority={item.priority} /><span><CalendarDays size={13} /> {item.dueDate ? formatDateKey(item.dueDate) : 'No due date'}</span><span><Users size={13} /> {members.length} teammates</span><Badge tone="accent">{dueLabel(item.dueDate, item.status)}</Badge></div>

    <Panel className="detail-progress"><div className="detail-progress-head"><span>Overall progress</span><b>{item.progress}%</b></div><Progress value={item.progress} /><small>{tasks.filter((task) => task.status === 'done').length} of {tasks.length} tasks completed</small></Panel>

    <Panel className="detail-panel">
      <div className="detail-tabs" role="tablist">{tabs.map(({ label, icon: Icon, count }) => <button role="tab" aria-selected={tab === label} className={tab === label ? 'is-active' : ''} key={label} onClick={() => setTab(label)}><Icon size={14} />{label}{count !== undefined && <em>{count}</em>}</button>)}</div>

      {tab === 'Overview' && <div className="detail-body detail-columns"><div>
        <h2>About this work</h2><p>{item.description || 'No description has been added yet.'}</p>
        {item.instructions && <><h3>Instructions</h3><p>{item.instructions}</p></>}
        {item.objective && <><h3>Objective</h3><p>{item.objective}</p></>}
        {item.requiredTools && <><h3>Required tools</h3><p>{item.requiredTools}</p></>}
        <div className="fact-grid"><div><small>Start date</small><b>{item.startDate ? formatDateKey(item.startDate) : 'Not set'}</b></div><div><small>Submission format</small><b>{item.submissionFormat || 'Not specified'}</b></div><div><small>Category</small><b>{item.category || 'General'}</b></div><div><small>Project type</small><b>{item.projectType ? humanStatus(item.projectType) : '—'}</b></div></div>
        {item.tags.length > 0 && <div className="tag-row">{item.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>}
      </div><aside className="detail-aside"><h3>Project lead</h3><div className="person-line"><Avatar name={snapshot.members.find((member) => member.id === item.projectLeadId)?.name ?? 'Unassigned'} /><span><b>{snapshot.members.find((member) => member.id === item.projectLeadId)?.name ?? 'Unassigned'}</b><small>Reported responsibility</small></span></div><h3>Team</h3>{members.length ? members.slice(0, 5).map((member) => <div className="person-line" key={member.id}><Avatar name={member.name} /><span><b>{member.name}</b><small>{member.academicRole || 'Teammate'}</small></span></div>) : <p className="muted">No teammates assigned yet.</p>}<Button onClick={() => setTab('Team')}>Manage team</Button></aside></div>}

      {tab === 'Tasks' && <div className="detail-body"><PanelHead title="Task board" subtitle="Break work into owned, trackable steps" action={<Button variant="primary" icon={Plus} onClick={onAddTask}>Add task</Button>} />
        {tasks.length ? <div className="task-list">{tasks.map((task) => <div className="task-row" key={task.id}><button className={`task-check ${task.status === 'done' ? 'is-done' : ''}`} aria-label={`Toggle ${task.title}`} onClick={() => void onTask(task, { status: task.status === 'done' ? 'todo' : 'done' })}>{task.status === 'done' && <Check size={13} />}</button><span className={task.status === 'done' ? 'task-done' : ''}><b>{task.title}</b><small>{snapshot.members.find((member) => member.id === task.assignedMemberId)?.name ?? 'Unassigned'}{task.dueDate ? ` · Due ${formatDateKey(task.dueDate)}` : ''}</small></span><select aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => void onTask(task, { status: event.target.value as Task['status'] })}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div>)}</div> : <EmptyState title="No tasks yet" text="A plan comes together one task at a time." action={<Button variant="primary" icon={Plus} onClick={onAddTask}>Add the first task</Button>} />}
      </div>}

      {tab === 'Team' && <div className="detail-body"><PanelHead title="Project team" subtitle="People assigned to this work" /><div className="person-grid">{members.map((member) => <div className="person-card" key={member.id}><Avatar name={member.name} /><div><b>{member.name}</b><small>{member.academicRole || 'Teammate'}</small></div><Badge tone={member.id === item.projectLeadId ? 'accent' : 'neutral'}>{member.id === item.projectLeadId ? 'Lead' : 'Member'}</Badge></div>)}{!members.length && <EmptyState title="No teammates assigned" text="Edit this work item to assign teammates." />}</div></div>}

      {tab === 'Documents' && <div className="detail-body"><PanelHead title="Project documents" subtitle="Reports, decks and references" action={<label className="btn btn-secondary"><CloudUpload size={15} />Upload<input type="file" multiple hidden onChange={(event) => void onUpload(event.target.files)} /></label>} />
        {files.length ? files.map((file) => <div className="file-line" key={file.id}><span className="file-mark"><FileText size={15} /></span><span><b>{file.displayName}</b><small>{formatBytes(file.sizeBytes)} · {humanStatus(file.category)}</small></span><Badge>v{file.version}</Badge></div>) : <EmptyState title="No project files yet" text="Upload reports and reference material in the Cloud Vault or here." />}
      </div>}

      {tab === 'Deliverables' && <div className="detail-body"><PanelHead title="Submission readiness" subtitle={`${checklists.length} checklist${checklists.length === 1 ? '' : 's'} for this work`} action={<Button variant="primary" icon={Plus} onClick={onAddChecklist}>Add checklist</Button>} />
        {item.deliverables.map((entry) => <div className="check-line" key={entry}><CheckSquare size={15} /><span>{entry}</span><small>Requested</small></div>)}
        {checklists.map((list) => {
          const done = list.items.filter((entry) => entry.done).length;
          return <div className="checklist-block" key={list.id}><div className="checklist-head"><b>{list.title}</b><small>{done}/{list.items.length} complete</small></div><Progress value={list.items.length ? Math.round(done / list.items.length * 100) : 0} />{list.items.map((entry) => <label className="check-line" key={entry.id}><input type="checkbox" checked={entry.done} onChange={() => void onChecklist(list, list.items.map((row) => row.id === entry.id ? { ...row, done: !row.done } : row))} /><span>{entry.label}</span></label>)}</div>;
        })}
        {!item.deliverables.length && !checklists.length && <EmptyState title="No submission checklist" text="Create a checklist to verify report and submission requirements." action={<Button variant="primary" icon={Plus} onClick={onAddChecklist}>Create checklist</Button>} />}
      </div>}

      {tab === 'Activity' && <div className="detail-body"><ActivityFeed records={snapshot.activities.filter((record) => record.relatedEntityId === item.id || tasks.some((task) => task.id === record.relatedEntityId)).slice(0, 15)} /></div>}
    </Panel>
  </>;
}


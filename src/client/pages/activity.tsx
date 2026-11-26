import { useState } from 'react';
import { Activity as ActivityIcon, ArrowUpRight, CheckSquare, Clock3, ShieldAlert } from 'lucide-react';
import { formatDateKey } from '@shared/dates';
import { formatTimestamp } from '@shared/dates';
import type { Task, WorkspaceSnapshot } from '@shared/types';
import { humanStatus } from '../lib/format';
import { Badge, Button, EmptyState, Eyebrow, Panel, PanelHead } from '../components/ui';

export function ActivityPage({ snapshot, onTask, onAddTask }: { snapshot: WorkspaceSnapshot; onTask: (task: Task, patch: Partial<Task>) => Promise<void>; onAddTask: () => void }) {
  const [tab, setTab] = useState<'activity' | 'tasks'>('activity');
  const tasks = snapshot.tasks.filter((task) => !task.isDeleted).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  return <>
    <header className="page-heading"><div><Eyebrow>WORKSPACE INTELLIGENCE</Eyebrow><h1>Activity & tasks</h1><p>A readable history of recorded changes and every assigned responsibility.</p></div><div className="heading-actions"><Button variant="primary" icon={CheckSquare} onClick={onAddTask}>Add task</Button></div></header>
    <Panel className="tab-panel"><div className="detail-tabs"><button className={tab === 'activity' ? 'is-active' : ''} onClick={() => setTab('activity')}><ActivityIcon size={14} /> Activity <em>{snapshot.activities.length}</em></button><button className={tab === 'tasks' ? 'is-active' : ''} onClick={() => setTab('tasks')}><CheckSquare size={14} /> Tasks <em>{tasks.length}</em></button></div>
      {tab === 'activity' && <div className="activity-log">{snapshot.activities.slice().reverse().map((record) => <div className="activity-log-row" key={record.id}>
        <span className="activity-icon"><ActivityIcon size={14} /></span><div><b>{record.description}</b><small>{humanStatus(record.eventType)} · {formatTimestamp(record.createdAt)}</small></div>
        <span className="activity-actor">{record.actorDisplayName || 'Unattributed'}</span>{record.relatedSubjectId && <Badge>{snapshot.subjects.find((subject) => subject.id === record.relatedSubjectId)?.code ?? 'Subject'}</Badge>}
      </div>)}{!snapshot.activities.length && <EmptyState title="No activity recorded" text="Workspace changes will appear here." />}</div>}
      {tab === 'tasks' && <div className="task-board"><PanelHead title="All tasks" subtitle="Click a task to update its status" />{tasks.map((task) => {
        const work = snapshot.workItems.find((item) => item.id === task.workItemId);
        const member = snapshot.members.find((item) => item.id === task.assignedMemberId);
        return <div className="task-board-row" key={task.id}><button className={`task-check ${task.status === 'done' ? 'is-done' : ''}`} aria-label={`Toggle ${task.title}`} onClick={() => void onTask(task, { status: task.status === 'done' ? 'todo' : 'done' })}>{task.status === 'done' && <CheckSquare size={13} />}</button>
          <div className="task-board-copy"><b className={task.status === 'done' ? 'task-done' : ''}>{task.title}</b><small>{work?.title ?? 'General work'} · {member?.name ?? 'Unassigned'}{task.dueDate ? ` · ${formatDateKey(task.dueDate)}` : ''}</small></div>
          <Badge tone={task.status === 'done' ? 'success' : task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) ? 'danger' : 'neutral'}>{humanStatus(task.status)}</Badge>
          <ArrowUpRight size={14} />
        </div>;
      })}{!tasks.length && <EmptyState title="No tasks yet" text="Create a task to assign a responsibility." action={<Button icon={CheckSquare} onClick={onAddTask}>Add task</Button>} />}</div>}
    </Panel>
    <p className="identity-note"><ShieldAlert size={14} /> Activity actor names are selected locally and are not verified identities.</p>
  </>;
}

export function CalendarPage({ snapshot, onAddTask }: { snapshot: WorkspaceSnapshot; onAddTask: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const query = new URLSearchParams(window.location.search).get('due');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const cells = monthCells(month);
  const dueOf = (key: string) => snapshot.workItems.filter((item) => item.dueDate === key && !item.isDeleted && !item.isArchived);
  const tasksOf = (key: string) => snapshot.tasks.filter((task) => task.dueDate === key && !task.isDeleted);
  const filterMatch = (date: string) => {
    if (!query || query === 'overdue') return true;
    const item = dueOf(date)[0];
    if (!item) return false;
    const diff = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
    return query === 'today' ? diff === 0 : query === 'three' ? diff > 0 && diff <= 3 : query === 'seven' ? diff > 0 && diff <= 7 : query === 'completed' ? item.status === 'completed' : true;
  };
  const active = selected && filterMatch(selected);
  return <>
    <header className="page-heading"><div><Eyebrow>TIME HORIZON</Eyebrow><h1>Calendar</h1><p>Dates read directly from saved work items and assigned tasks.</p></div><div className="heading-actions"><Button variant="primary" icon={CheckSquare} onClick={onAddTask}>Schedule task</Button></div></header>
    <div className="calendar-layout"><Panel className="calendar-panel"><div className="calendar-head"><button onClick={() => setMonth(shift(month, -1))} aria-label="Previous month">‹</button><h2>{new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2><button onClick={() => setMonth(shift(month, 1))} aria-label="Next month">›</button></div>
      <div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">{cells.map((date) => {
        const work = dueOf(date).filter(() => filterMatch(date));
        const taskCount = tasksOf(date).length;
        return <button className={`calendar-cell ${date.slice(0, 7) === month ? '' : 'is-outside'} ${date === today ? 'is-today' : ''} ${date === selected ? 'is-selected' : ''} ${work.some((item) => item.dueDate! < today) ? 'has-overdue' : ''}`} key={date} onClick={() => setSelected(date)}><span>{Number(date.slice(8))}</span><div className="calendar-dots">{work.slice(0, 3).map((item) => <i key={item.id} style={{ background: snapshot.subjects.find((subject) => subject.id === item.subjectId)?.color }} />)}{taskCount > 0 && <em>{taskCount}</em>}</div>{work.length > 0 && <small>{work[0].title}</small>}</button>;
      })}</div>
    </Panel>
      <Panel className="agenda-panel"><PanelHead title={formatDateKey(selected)} subtitle={active ? `${dueOf(selected).length} deadlines · ${tasksOf(selected).length} tasks` : 'Outside the selected deadline band'} />
        <div className="agenda-list">{dueOf(selected).map((item) => <div className="agenda-card" key={item.id}><span className="agenda-bar" style={{ background: snapshot.subjects.find((subject) => subject.id === item.subjectId)?.color }} /><div><b>{item.title}</b><small>{snapshot.subjects.find((subject) => subject.id === item.subjectId)?.code ?? 'Semester 5'} · {humanStatus(item.type)}</small></div><Badge tone={item.status === 'completed' ? 'success' : 'accent'}>{humanStatus(item.status)}</Badge></div>)}
          {tasksOf(selected).map((task) => <div className="agenda-card" key={task.id}><span className="agenda-bar task"><Clock3 size={12} /></span><div><b>{task.title}</b><small>Task · {snapshot.members.find((member) => member.id === task.assignedMemberId)?.name ?? 'Unassigned'}</small></div><Badge>{humanStatus(task.status)}</Badge></div>)}
          {!dueOf(selected).length && !tasksOf(selected).length && <EmptyState title="Clear day" text="No work or task is due on this date." />}</div>
      </Panel>
    </div>
  </>;
}

function monthCells(month: string): string[] {
  const [year, numericMonth] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, numericMonth - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, numericMonth, 0)).getUTCDate();
  const cells: string[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(Date.UTC(year, numericMonth - 1, index - startOffset + 1));
    cells.push(date.toISOString().slice(0, 10));
  }
  void daysInMonth;
  return cells;
}

function shift(month: string, delta: number): string {
  const [year, numericMonth] = month.split('-').map(Number);
  return new Date(Date.UTC(year, numericMonth - 1 + delta, 1)).toISOString().slice(0, 7);
}

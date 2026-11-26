import { useEffect, useState, type CSSProperties } from 'react';
import { Activity, ArrowUpRight, CalendarDays, Check, CheckSquare, CloudUpload, FolderKanban, Plus, ShieldAlert, Sparkles, Users, Zap, type LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildAnalytics } from '@shared/analytics';
import { TERMINAL_STATUSES } from '@shared/constants';
import { formatDateKey } from '@shared/dates';
import type { Activity as ActivityRecord, WorkspaceSnapshot } from '@shared/types';
import type { ModalKind } from '../contracts';
import { dueLabel, dueTone, humanStatus, initials, timeAgo } from '../lib/format';
import { Button, EmptyState, Eyebrow, Panel, PanelHead, Progress, TextLink } from '../components/ui';

interface Props {
  snapshot: WorkspaceSnapshot;
  analytics: ReturnType<typeof buildAnalytics>;
  onAdd: (kind: Exclude<ModalKind, null>) => void;
  onNavigate: (path: string) => void;
  onSubjectOpen: (id: string) => void;
}

export function Dashboard({ snapshot, analytics, onAdd, onNavigate, onSubjectOpen }: Props) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const upcoming = snapshot.workItems
    .filter((item) => !item.isDeleted && !item.isArchived && item.dueDate && !TERMINAL_STATUSES.has(item.status))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')).slice(0, 5);
  const subjects = snapshot.subjects.filter((subject) => !subject.isDeleted && !subject.isArchived);
  const radar = [
    { key: 'today', title: 'Due today', value: analytics.radar.today, tone: 'danger' },
    { key: 'three', title: 'Next 3 days', value: analytics.radar.three, tone: 'warning' },
    { key: 'seven', title: 'Next 7 days', value: analytics.radar.seven, tone: 'accent' },
    { key: 'overdue', title: 'Overdue', value: analytics.radar.overdue, tone: 'danger' },
    { key: 'completed', title: 'Completed', value: analytics.radar.completed, tone: 'success' },
  ] as const;

  return <>
    <header className="dashboard-hero">
      <div className="hero-copy">
        <Eyebrow>SEMESTER 5 · COMMAND CENTER</Eyebrow>
        <h1>Good day. <span>Welcome to Sky Vault.</span></h1>
        <p>Your Semester 5 command center. Every project, deadline, teammate and document in one field of view.</p>
        <div className="hero-actions"><Button variant="primary" icon={Plus} onClick={() => onAdd('project')}>Start a project</Button><Button icon={CloudUpload} onClick={() => onAdd('assignment')}>Add assignment</Button></div>
      </div>
      <div className="hero-instruments">
        <OrbitGlyph />
        <div className="date-card"><span>LOCAL DATE · IST</span><strong>{clock.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</strong><small>{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST · {clock.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' })}</small></div>
      </div>
    </header>

    <div className="metrics-grid">
      <Metric label="Active projects" value={analytics.activeProjects} detail={`${analytics.totalProjects} total projects`} icon={FolderKanban} tone="accent" onClick={() => onNavigate('/projects')} />
      <Metric label="Pending assignments" value={analytics.pendingAssignments} detail={`${analytics.completedAssignments} completed`} icon={CheckSquare} tone="blue" onClick={() => onNavigate('/assignments')} />
      <Metric label="Lab activities" value={analytics.activeLabs} detail="Active practical work" icon={Zap} tone="mint" onClick={() => onNavigate('/labs')} />
      <Metric label="Due this week" value={analytics.upcomingDeadlines} detail="Including today" icon={CalendarDays} tone="amber" onClick={() => onNavigate('/calendar')} />
      <Metric label="Completed work" value={analytics.completedWork} detail={`${analytics.submissionCompletionRate}% completion rate`} icon={Check} tone="mint" onClick={() => onNavigate('/analytics')} />
      <Metric label="Overdue" value={analytics.overdueItems} detail={analytics.overdueItems ? 'Needs attention' : 'All caught up'} icon={Activity} tone="coral" onClick={() => onNavigate('/calendar?due=overdue')} />
    </div>

    <div className="dashboard-two">
      <Panel className="deadline-panel">
        <PanelHead title="Priority queue" subtitle="The next deadlines on the horizon" action={<TextLink onClick={() => onNavigate('/calendar')}>Open calendar <ArrowUpRight size={13} /></TextLink>} />
        <div className="deadline-rows">
          {upcoming.length ? upcoming.map((item) => {
            const subject = snapshot.subjects.find((entry) => entry.id === item.subjectId);
            return <button className="deadline-row" key={item.id} onClick={() => onNavigate(`/projects/${item.id}`)}>
              <span className={`deadline-date ${dueTone(item.dueDate, item.status)}`}><b>{item.dueDate?.slice(8)}</b><small>{formatDateKey(item.dueDate!).split(' ')[1]}</small></span>
              <span className="deadline-copy"><b>{item.title}</b><small><i style={{ background: subject?.color }} />{subject?.code ?? 'S5'} · {humanStatus(item.type)}</small></span>
              <span className={`due-chip ${dueTone(item.dueDate, item.status)}`}>{dueLabel(item.dueDate, item.status)}</span>
              <Progress value={item.progress} className="deadline-progress" />
            </button>;
          }) : <EmptyState title="A clear horizon" text="No upcoming deadlines. Add dated work to start planning." />}
        </div>
      </Panel>

      <Panel className="radar-panel">
        <PanelHead title="Deadline radar" subtitle="Live counts from workspace records" />
        <div className="radar-rows">{radar.map((row) => <button className="radar-row" key={row.key} onClick={() => onNavigate(`/calendar?due=${row.key}`)}><span className={`radar-tick ${row.tone}`} /><span>{row.title}</span><b>{row.value}</b><ArrowUpRight size={13} /></button>)}</div>
        <p className="panel-note">Select a band to see matching items on the calendar.</p>
      </Panel>
    </div>

    <div className="dashboard-two dashboard-two-lower">
      <Panel className="subject-panel">
        <PanelHead title="Subject overview" subtitle={`${subjects.length} subjects this semester`} action={<TextLink onClick={() => onNavigate('/subjects')}>All subjects <ArrowUpRight size={13} /></TextLink>} />
        <div className="subject-rows">{subjects.slice(0, 6).map((subject) => {
          const records = snapshot.workItems.filter((item) => item.subjectId === subject.id && !item.isDeleted);
          const pending = records.filter((item) => !TERMINAL_STATUSES.has(item.status)).length;
          const progress = records.length ? Math.round(records.reduce((sum, item) => sum + item.progress, 0) / records.length) : 0;
          return <button className="subject-row" key={subject.id} onClick={() => onSubjectOpen(subject.id)}><span className="subject-glyph" style={{ '--subject': subject.color } as CSSProperties}>{subject.code.slice(0, 2)}</span><span className="subject-row-copy"><b>{subject.name}</b><small>{subject.code} · {pending} active</small></span><span className="subject-row-progress"><Progress value={progress} color={subject.color} /><small>{progress}%</small></span><ArrowUpRight size={14} /></button>;
        })}{!subjects.length && <EmptyState title="No subjects yet" text="Add subjects to organize the semester." action={<Button onClick={() => onAdd('subject')} icon={Plus}>Add subject</Button>} />}</div>
      </Panel>

      <Panel className="workload-panel">
        <PanelHead title="Workload by subject" subtitle="Recorded projects, assignments and labs" action={<TextLink onClick={() => onNavigate('/analytics')}>Analytics <ArrowUpRight size={13} /></TextLink>} />
        <div className="chart-medium">
          {analytics.workloadBySubject.some((row) => row.total > 0) ? <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.workloadBySubject.slice(0, 7)} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line-soft)" />
              <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
              <Bar dataKey="projects" name="Projects" stackId="work" fill="#47C9FF" />
              <Bar dataKey="assignments" name="Assignments" stackId="work" fill="#8DAAFF" />
              <Bar dataKey="labs" name="Labs" stackId="work" fill="#5FD5AE" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer> : <EmptyState title="No workload data" text="Add academic work to see the workload chart." />}
        </div>
        <div className="chart-key"><span><i className="key-blue" />Projects</span><span><i className="key-violet" />Assignments</span><span><i className="key-mint" />Labs</span></div>
      </Panel>
    </div>

    <div className="dashboard-two dashboard-two-last">
      <Panel className="activity-panel">
        <PanelHead title="Recent activity" subtitle="Latest recorded changes" action={<TextLink onClick={() => onNavigate('/activity')}>Full history <ArrowUpRight size={13} /></TextLink>} />
        <ActivityFeed records={snapshot.activities.slice(0, 5)} />
      </Panel>
      <Panel className="quick-panel">
        <PanelHead title="Quick actions" subtitle="Every action opens a working form" />
        <div className="quick-tiles">
          <button onClick={() => onAdd('project')}><span className="tile-icon"><FolderKanban size={17} /></span><b>New project</b><Plus size={13} /></button>
          <button onClick={() => onAdd('assignment')}><span className="tile-icon"><CheckSquare size={17} /></span><b>Assignment</b><Plus size={13} /></button>
          <button onClick={() => onAdd('lab')}><span className="tile-icon"><Zap size={17} /></span><b>Lab activity</b><Plus size={13} /></button>
          <button onClick={() => onAdd('task')}><span className="tile-icon"><Users size={17} /></span><b>Team task</b><Plus size={13} /></button>
          <button onClick={() => onAdd('member')}><span className="tile-icon"><Users size={17} /></span><b>Teammate</b><Plus size={13} /></button>
          <label><span className="tile-icon"><CloudUpload size={17} /></span><b>Upload file</b><Plus size={13} /><input type="file" multiple hidden onChange={(event) => { const files = event.target.files; if (files?.length) window.dispatchEvent(new CustomEvent('sky-upload', { detail: files })); }} /></label>
        </div>
        <p className="panel-note"><ShieldAlert size={12} /> Actor labels are reported, not verified.</p>
      </Panel>
    </div>
  </>;
}

function Metric({ label, value, detail, icon: Icon, tone, onClick }: { label: string; value: number; detail: string; icon: LucideIcon; tone: string; onClick: () => void }) {
  return <button className="metric" style={{ '--tone': `var(--${tone})` } as CSSProperties} onClick={onClick}><span className="metric-top"><span>{label}</span><i><Icon size={16} /></i></span><strong>{value}</strong><small>{detail}</small><ArrowUpRight className="metric-arrow" size={14} /></button>;
}

function OrbitGlyph() {
  return <svg className="orbit-glyph" viewBox="0 0 160 160" aria-hidden="true" fill="none">
    <circle cx="80" cy="80" r="70" stroke="var(--line)" />
    <circle cx="80" cy="80" r="48" stroke="var(--line)" />
    <circle cx="80" cy="80" r="24" stroke="var(--accent)" strokeOpacity=".6" />
    <circle cx="80" cy="80" r="5" fill="var(--accent)" />
    <circle cx="150" cy="80" r="4" fill="var(--accent-2)" />
    <circle cx="80" cy="32" r="3" fill="var(--accent)" fillOpacity=".7" />
    <path d="M10 80h17M133 80h17M80 10v17M80 133v17" stroke="var(--line)" />
  </svg>;
}

export function ActivityFeed({ records }: { records: ActivityRecord[] }) {
  if (!records.length) return <EmptyState title="No activity yet" text="Workspace changes are recorded here as they happen." />;
  return <div className="activity-feed">{records.map((record) => <div className="activity-item" key={record.id}><span className="activity-icon"><Sparkles size={14} /></span><span className="activity-copy"><b>{record.description}</b><small>{record.actorDisplayName || 'Unattributed'} · {timeAgo(record.createdAt)}</small></span></div>)}</div>;
}

export function MetricAvatar({ name }: { name: string }) { return <span className="avatar">{initials(name)}</span>; }

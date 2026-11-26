import { Activity, ArrowUpRight, Boxes, CalendarClock, CheckCircle2, Cloud, Gauge, Layers, Target } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsSummary } from '@shared/types';
import { Badge, EmptyState, Eyebrow, Panel, PanelHead, Progress } from '../components/ui';

const palette = ['#47C9FF', '#8DAAFF', '#5FD5AE', '#F5B971', '#FF7A8A', '#C9B6FF'];

export function AnalyticsPage({ analytics, onNavigate }: { analytics: AnalyticsSummary; onNavigate: (path: string) => void }) {
  const statusData = analytics.statusDistribution.filter((row) => row.count > 0);
  const memberData = analytics.tasksByMember.filter((row) => row.assigned > 0);
  return <>
    <header className="page-heading"><div><Eyebrow>WORKSPACE INTELLIGENCE</Eyebrow><h1>Analytics</h1><p>Live indicators derived from saved work, tasks and documents. No guessed numbers.</p></div><div className="heading-actions"><Badge tone="accent"><Gauge size={12} /> {analytics.submissionCompletionRate}% complete</Badge></div></header>

    <div className="insight-grid">{analytics.insights.map((insight) => <div className={`insight-card insight-${insight.level}`} key={insight.id}><span>{insight.level === 'attention' ? <Target size={17} /> : insight.level === 'watch' ? <CalendarClock size={17} /> : <Activity size={17} />}</span><div><b>{insight.title}</b><p>{insight.detail}</p></div><ArrowUpRight size={14} /></div>)}</div>

    <div className="metrics-grid analytics-metrics">
      <AnalyticMetric label="Projects" value={analytics.totalProjects} detail={`${analytics.completedProjects} completed`} icon={Boxes} onClick={() => onNavigate('/projects')} />
      <AnalyticMetric label="Assignments" value={analytics.pendingAssignments} detail="Still open" icon={CheckCircle2} onClick={() => onNavigate('/assignments')} />
      <AnalyticMetric label="Deadline radar" value={analytics.radar.today + analytics.radar.three + analytics.radar.seven} detail={`${analytics.overdueItems} overdue`} icon={CalendarClock} onClick={() => onNavigate('/calendar')} />
      <AnalyticMetric label="Team tasks" value={memberData.reduce((sum, row) => sum + row.assigned, 0)} detail={`${memberData.reduce((sum, row) => sum + row.completed, 0)} done`} icon={Layers} onClick={() => onNavigate('/activity')} />
    </div>

    <div className="dashboard-two">
      <Panel><PanelHead title="Workload by subject" subtitle="Projects, assignments and labs" /><div className="chart-medium">{statusData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.workloadBySubject.slice(0, 8)} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line-soft)" /><XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Bar dataKey="projects" stackId="a" fill="#47C9FF" /><Bar dataKey="assignments" stackId="a" fill="#8DAAFF" /><Bar dataKey="labs" stackId="a" fill="#5FD5AE" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState title="No workload data" text="Add dated work to build this chart." />}</div></Panel>
      <Panel><PanelHead title="Status distribution" subtitle="Live work item statuses" /><div className="chart-medium chart-pie">{statusData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="count" nameKey="label" innerRadius={50} outerRadius={78} paddingAngle={2} stroke="none">{statusData.map((entry, index) => <Cell key={entry.status} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--muted)' }} /></PieChart></ResponsiveContainer> : <EmptyState title="No status data" text="Create work to see distribution." />}</div></Panel>
    </div>

    <div className="dashboard-two">
      <Panel><PanelHead title="Completion trend" subtitle="Created versus completed over eight weeks" /><div className="chart-medium"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.completionTrend} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}><defs><linearGradient id="skyfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#47C9FF" stopOpacity={0.35} /><stop offset="100%" stopColor="#47C9FF" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line-soft)" /><XAxis dataKey="week" tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="created" name="Created" stroke="#8DAAFF" strokeWidth={2} fill="transparent" /><Area type="monotone" dataKey="completed" name="Completed" stroke="#47C9FF" strokeWidth={2} fill="url(#skyfill)" /></AreaChart></ResponsiveContainer></div></Panel>
      <Panel><PanelHead title="Assigned task load" subtitle="Assigned and completed tasks by teammate" /><div className="member-chart">{memberData.length ? memberData.map((row, index) => <div className="member-chart-row" key={row.memberId}><span>{row.name}</span><div><i style={{ width: `${Math.min(100, row.completed / Math.max(1, row.assigned) * 100)}%`, background: palette[index % palette.length] }} /><small>{row.completed}/{row.assigned} done{row.overdue ? ` · ${row.overdue} overdue` : ''}</small></div></div>) : <EmptyState title="No task data" text="Assign tasks to teammates to see workload." />}</div></Panel>
    </div>

    <div className="dashboard-two">
      <Panel><PanelHead title="Deadline pressure" subtitle="Undated and completed work is excluded" /><div className="chart-short"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.deadlinesByWeek} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line-soft)" /><XAxis dataKey="week" tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Bar dataKey="count" name="Open deadlines" fill="#F5B971" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
      <Panel><PanelHead title="Vault storage" subtitle="Current files and retained versions" /><div className="storage-breakdown">{analytics.storage.byCategory.map((row, index) => <div className="storage-row" key={row.category}><span className="storage-dot" style={{ background: palette[index % palette.length] }} /><span>{row.category}</span><b>{row.count}</b><Progress value={analytics.storage.totalBytes ? Math.round(row.bytes / analytics.storage.totalBytes * 100) : 0} color={palette[index % palette.length]} /></div>)}{!analytics.storage.byCategory.length && <EmptyState title="Vault is empty" text="Upload files to analyze storage." />}<div className="storage-total"><Cloud size={15} /><span>Total retained</span><b>{Math.round(analytics.storage.totalBytes / 1024 / 1024 * 10) / 10} MB</b></div></div></Panel>
    </div>
  </>;
}

function AnalyticMetric({ label, value, detail, icon: Icon, onClick }: { label: string; value: number; detail: string; icon: typeof Boxes; onClick: () => void }) {
  return <button className="metric" onClick={onClick}><span className="metric-top"><span>{label}</span><i><Icon size={16} /></i></span><strong>{value}</strong><small>{detail}</small><ArrowUpRight className="metric-arrow" size={14} /></button>;
}

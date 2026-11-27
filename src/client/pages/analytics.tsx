import { lazy, Suspense } from 'react';
import { Activity, ArrowUpRight, Boxes, CalendarClock, CheckCircle2, Cloud, Gauge, Layers, Target } from 'lucide-react';
import type { AnalyticsSummary } from '@shared/types';
import { Badge, EmptyState, Eyebrow, Panel, PanelHead, Progress } from '../components/ui';

const palette = ['#47C9FF', '#8DAAFF', '#5FD5AE', '#F5B971', '#FF7A8A', '#C9B6FF'];

const charts = () => import('../components/charts/analytics-charts');
const WorkloadChart = lazy(() => charts().then((module) => ({ default: module.WorkloadChart })));
const StatusDistributionChart = lazy(() => charts().then((module) => ({ default: module.StatusDistributionChart })));
const CompletionTrendChart = lazy(() => charts().then((module) => ({ default: module.CompletionTrendChart })));
const DeadlinesByWeekChart = lazy(() => charts().then((module) => ({ default: module.DeadlinesByWeekChart })));

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
      <Panel><PanelHead title="Workload by subject" subtitle="Projects, assignments and labs" /><div className="chart-medium">{statusData.length ? <Suspense fallback={<div className="chart-loading" />}><WorkloadChart data={analytics.workloadBySubject.slice(0, 8)} /></Suspense> : <EmptyState title="No workload data" text="Add dated work to build this chart." />}</div></Panel>
      <Panel><PanelHead title="Status distribution" subtitle="Live work item statuses" /><div className="chart-medium chart-pie">{statusData.length ? <Suspense fallback={<div className="chart-loading" />}><StatusDistributionChart data={statusData} /></Suspense> : <EmptyState title="No status data" text="Create work to see distribution." />}</div></Panel>
    </div>

    <div className="dashboard-two">
      <Panel><PanelHead title="Completion trend" subtitle="Created versus completed over eight weeks" /><div className="chart-medium"><Suspense fallback={<div className="chart-loading" />}><CompletionTrendChart data={analytics.completionTrend} /></Suspense></div></Panel>
      <Panel><PanelHead title="Assigned task load" subtitle="Assigned and completed tasks by teammate" /><div className="member-chart">{memberData.length ? memberData.map((row, index) => <div className="member-chart-row" key={row.memberId}><span>{row.name}</span><div><i style={{ width: `${Math.min(100, row.completed / Math.max(1, row.assigned) * 100)}%`, background: palette[index % palette.length] }} /><small>{row.completed}/{row.assigned} done{row.overdue ? ` · ${row.overdue} overdue` : ''}</small></div></div>) : <EmptyState title="No task data" text="Assign tasks to teammates to see workload." />}</div></Panel>
    </div>

    <div className="dashboard-two">
      <Panel><PanelHead title="Deadline pressure" subtitle="Undated and completed work is excluded" /><div className="chart-short"><Suspense fallback={<div className="chart-loading" />}><DeadlinesByWeekChart data={analytics.deadlinesByWeek} /></Suspense></div></Panel>
      <Panel><PanelHead title="Vault storage" subtitle="Current files and retained versions" /><div className="storage-breakdown">{analytics.storage.byCategory.map((row, index) => <div className="storage-row" key={row.category}><span className="storage-dot" style={{ background: palette[index % palette.length] }} /><span>{row.category}</span><b>{row.count}</b><Progress value={analytics.storage.totalBytes ? Math.round(row.bytes / analytics.storage.totalBytes * 100) : 0} color={palette[index % palette.length]} /></div>)}{!analytics.storage.byCategory.length && <EmptyState title="Vault is empty" text="Upload files to analyze storage." />}<div className="storage-total"><Cloud size={15} /><span>Total retained</span><b>{Math.round(analytics.storage.totalBytes / 1024 / 1024 * 10) / 10} MB</b></div></div></Panel>
    </div>
  </>;
}

function AnalyticMetric({ label, value, detail, icon: Icon, onClick }: { label: string; value: number; detail: string; icon: typeof Boxes; onClick: () => void }) {
  return <button className="metric" onClick={onClick}><span className="metric-top"><span>{label}</span><i><Icon size={16} /></i></span><strong>{value}</strong><small>{detail}</small><ArrowUpRight className="metric-arrow" size={14} /></button>;
}

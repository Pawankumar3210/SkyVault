import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsSummary } from '@shared/types';

const palette = ['#47C9FF', '#8DAAFF', '#5FD5AE', '#F5B971', '#FF7A8A', '#C9B6FF'];

export function WorkloadChart({ data }: { data: AnalyticsSummary['workloadBySubject'] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line-soft)" /><XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Bar dataKey="projects" stackId="a" fill="#47C9FF" /><Bar dataKey="assignments" stackId="a" fill="#8DAAFF" /><Bar dataKey="labs" stackId="a" fill="#5FD5AE" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>;
}

export function StatusDistributionChart({ data }: { data: AnalyticsSummary['statusDistribution'] }) {
  return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={78} paddingAngle={2} stroke="none">{data.map((entry, index) => <Cell key={entry.status} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--muted)' }} /></PieChart></ResponsiveContainer>;
}

export function CompletionTrendChart({ data }: { data: AnalyticsSummary['completionTrend'] }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}><defs><linearGradient id="skyfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#47C9FF" stopOpacity={0.35} /><stop offset="100%" stopColor="#47C9FF" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line-soft)" /><XAxis dataKey="week" tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="created" name="Created" stroke="#8DAAFF" strokeWidth={2} fill="transparent" /><Area type="monotone" dataKey="completed" name="Completed" stroke="#47C9FF" strokeWidth={2} fill="url(#skyfill)" /></AreaChart></ResponsiveContainer>;
}

export function DeadlinesByWeekChart({ data }: { data: AnalyticsSummary['deadlinesByWeek'] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line-soft)" /><XAxis dataKey="week" tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }} /><Bar dataKey="count" name="Open deadlines" fill="#F5B971" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>;
}

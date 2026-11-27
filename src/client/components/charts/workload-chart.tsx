import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsSummary } from '@shared/types';

export function WorkloadChart({ data }: { data: AnalyticsSummary['workloadBySubject'] }) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--line-soft)" />
      <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
      <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
      <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
      <Bar dataKey="projects" name="Projects" stackId="work" fill="#47C9FF" />
      <Bar dataKey="assignments" name="Assignments" stackId="work" fill="#8DAAFF" />
      <Bar dataKey="labs" name="Labs" stackId="work" fill="#5FD5AE" radius={[3, 3, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>;
}

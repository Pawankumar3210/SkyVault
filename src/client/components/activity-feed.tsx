import { Sparkles } from 'lucide-react';
import type { Activity as ActivityRecord } from '@shared/types';
import { timeAgo } from '../lib/format';
import { EmptyState } from './ui';

export function ActivityFeed({ records }: { records: ActivityRecord[] }) {
  if (!records.length) return <EmptyState title="No activity yet" text="Workspace changes are recorded here as they happen." />;
  return <div className="activity-feed">{records.map((record) => <div className="activity-item" key={record.id}><span className="activity-icon"><Sparkles size={14} /></span><span className="activity-copy"><b>{record.description}</b><small>{record.actorDisplayName || 'Unattributed'} · {timeAgo(record.createdAt)}</small></span></div>)}</div>;
}

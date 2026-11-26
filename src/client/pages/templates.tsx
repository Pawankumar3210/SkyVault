import { CheckSquare, Download, Eye, FileText, Plus, Star, Trash2 } from 'lucide-react';
import { TEMPLATE_CATEGORY_LABELS } from '@shared/constants';
import { checklistStats } from '@shared/analytics';
import { formatDateKey } from '@shared/dates';
import { formatBytes } from '@shared/files';
import type { Checklist, DocumentRecord, TemplateRecord, WorkspaceSnapshot } from '@shared/types';
import { Badge, Button, EmptyState, Eyebrow, IconButton, Panel, PanelHead, Progress } from '../components/ui';

export function TemplatesPage({ snapshot, onAdd, onDownload, onPreview, onUse, onDelete }: {
  snapshot: WorkspaceSnapshot;
  onAdd: () => void;
  onDownload: (document: DocumentRecord) => void;
  onPreview: (document: DocumentRecord) => void;
  onUse: (template: TemplateRecord) => void;
  onDelete: (template: TemplateRecord) => void;
}) {
  const templates = snapshot.templates.filter((item) => !item.isDeleted);
  return <>
    <header className="page-heading"><div><Eyebrow>REUSABLE ACADEMIC FORMATS</Eyebrow><h1>Template Library</h1><p>College formats with checklist support, version labels and linked documents.</p></div><div className="heading-actions"><Button variant="primary" icon={Plus} onClick={onAdd}>Add template</Button></div></header>
    <div className="card-grid template-cards">{templates.map((template) => {
      const doc = snapshot.documents.find((item) => item.id === template.documentId && !item.isDeleted);
      const stats = checklistStats(template.checklistItems);
      const subject = snapshot.subjects.find((item) => item.id === template.subjectId);
      return <article className="template-card" key={template.id}>
        <div className="template-top"><span className="template-mark"><FileText size={19} /></span><div className="subject-card-tools">{template.isOfficial && <Badge tone="accent"><Star size={11} /> Official</Badge>}<IconButton label={`Delete ${template.name}`} icon={Trash2} className="tiny danger" onClick={() => onDelete(template)} /></div></div>
        <span className="mono-label">{TEMPLATE_CATEGORY_LABELS[template.templateCategory]}</span><h2>{template.name}</h2><p>{template.description || 'No description added.'}</p>
        <div className="template-facts"><span>{subject?.code ?? 'All subjects'}</span><span>v{template.versionLabel}</span><span>{template.source || 'Source not set'}</span></div>
        {doc ? <div className="template-file"><span><FileText size={14} />{doc.displayName}</span><small>{formatBytes(doc.sizeBytes)} · {formatDateKey(doc.createdAt.slice(0, 10))}</small><div className="row-tools"><IconButton label="Preview template" icon={Eye} className="tiny" onClick={() => onPreview(doc)} /><IconButton label="Download template" icon={Download} className="tiny" onClick={() => onDownload(doc)} /></div></div> : <p className="muted template-missing">No document attached. Edit or replace when you have the format.</p>}
        <div className="template-checklist"><div className="template-progress-label"><small>Checklist</small><b>{stats.completed}/{stats.total}</b></div><Progress value={stats.percentage} /></div>
        <Button icon={CheckSquare} onClick={() => onUse(template)}>Use checklist</Button>
      </article>;
    })}</div>
    {!templates.length && <Panel><EmptyState icon={FileText} title="No templates saved" text="Add a reusable college format, then attach its file and checklist." action={<Button variant="primary" icon={Plus} onClick={onAdd}>Add template</Button>} /></Panel>}
  </>;
}

export function ChecklistsPage({ snapshot, onAdd, onToggle }: { snapshot: WorkspaceSnapshot; onAdd: () => void; onToggle: (checklist: Checklist, items: Checklist['items']) => void }) {
  const lists = snapshot.checklists.filter((item) => !item.isDeleted);
  return <>
    <header className="page-heading"><div><Eyebrow>SUBMISSION CONTROL</Eyebrow><h1>Checklists</h1><p>Reusable and work-specific verification lists, all based on saved records.</p></div><div className="heading-actions"><Button variant="primary" icon={Plus} onClick={onAdd}>New checklist</Button></div></header>
    <div className="checklist-grid">{lists.map((list) => {
      const stats = checklistStats(list.items);
      const work = snapshot.workItems.find((item) => item.id === list.workItemId);
      const template = snapshot.templates.find((item) => item.id === list.templateId);
      return <Panel className="checklist-card" key={list.id}><PanelHead title={list.title} subtitle={work?.title ?? template?.name ?? 'General checklist'} action={<Badge tone={stats.percentage === 100 ? 'success' : stats.percentage > 0 ? 'accent' : 'neutral'}>{stats.percentage}%</Badge>} />
        <Progress value={stats.percentage} />
        <div className="checklist-items">{list.items.map((item) => <label key={item.id} className={`check-line ${item.done ? 'is-checked' : ''}`}><input type="checkbox" checked={item.done} onChange={() => onToggle(list, list.items.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))} /><span>{item.label}</span>{item.group && <small>{item.group}</small>}</label>)}</div>
      </Panel>;
    })}</div>
    {!lists.length && <Panel><EmptyState icon={CheckSquare} title="No checklists yet" text="Build a checklist for a report, lab record or submission." action={<Button variant="primary" icon={Plus} onClick={onAdd}>Create checklist</Button>} /></Panel>}
  </>;
}

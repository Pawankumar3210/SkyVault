import { useState, type CSSProperties } from 'react';
import { Archive, CloudUpload, Download, FileText, FolderKanban, RotateCcw, Trash2 } from 'lucide-react';
import { formatDateKey } from '@shared/dates';
import { formatBytes } from '@shared/files';
import type { DocumentRecord, Subject, WorkspaceSnapshot, WorkItem } from '@shared/types';
import { Badge, Button, EmptyState, Eyebrow, Panel, PanelHead } from '../components/ui';

interface ArchiveProps {
  snapshot: WorkspaceSnapshot;
  onRestoreSubject: (subject: Subject) => void;
  onRestoreWork: (item: WorkItem) => void;
  onRestoreDocument: (document: DocumentRecord) => void;
}

export function ArchivePage({ snapshot, onRestoreSubject, onRestoreWork, onRestoreDocument }: ArchiveProps) {
  const subjects = snapshot.subjects.filter((item) => item.isDeleted || item.isArchived);
  const work = snapshot.workItems.filter((item) => item.isDeleted || item.isArchived);
  const documents = snapshot.documents.filter((item) => item.isDeleted || item.isArchived);
  const total = subjects.length + work.length + documents.length;
  return <>
    <header className="page-heading"><div><Eyebrow>RECOVERY</Eyebrow><h1>Archive</h1><p>Removed records stay recoverable until the workspace is cleared.</p></div><div className="heading-actions"><Badge><Archive size={12} /> {total} archived</Badge></div></header>
    <div className="archive-groups">
      <Panel><PanelHead title="Subjects" subtitle={`${subjects.length} archived`} />{subjects.length ? subjects.map((subject) => <div className="archive-row" key={subject.id}><span className="archive-icon" style={{ '--subject': subject.color } as CSSProperties}><FolderKanban size={16} /></span><div><b>{subject.name}</b><small>{subject.code} · {formatDateKey((subject.deletedAt ?? subject.archivedAt ?? subject.createdAt).slice(0, 10))}</small></div><Button icon={RotateCcw} onClick={() => onRestoreSubject(subject)}>Restore</Button></div>) : <EmptyState title="No archived subjects" text="Deleted subjects can be restored here." />}</Panel>
      <Panel><PanelHead title="Academic work" subtitle={`${work.length} archived`} />{work.length ? work.map((item) => <div className="archive-row" key={item.id}><span className="archive-icon"><FileText size={16} /></span><div><b>{item.title}</b><small>{item.type} · {formatDateKey((item.deletedAt ?? item.archivedAt ?? item.createdAt).slice(0, 10))}</small></div><Button icon={RotateCcw} onClick={() => onRestoreWork(item)}>Restore</Button></div>) : <EmptyState title="No archived work" text="Deleted projects, assignments and labs can be restored here." />}</Panel>
      <Panel><PanelHead title="Vault files" subtitle={`${documents.length} archived`} />{documents.length ? documents.map((doc) => <div className="archive-row" key={doc.id}><span className="archive-icon"><CloudUpload size={16} /></span><div><b>{doc.displayName}</b><small>{formatBytes(doc.sizeBytes)} · {formatDateKey((doc.deletedAt ?? doc.archivedAt ?? doc.createdAt).slice(0, 10))}</small></div><Button icon={RotateCcw} onClick={() => onRestoreDocument(doc)}>Restore</Button></div>) : <EmptyState title="No archived files" text="Soft-deleted vault documents can be restored here." />}</Panel>
    </div>
  </>;
}

interface SettingsProps {
  snapshot: WorkspaceSnapshot;
  demo: boolean;
  busy: boolean;
  actions: {
    exportWorkspace: () => Promise<void>;
    importWorkspace: (file: File) => Promise<void>;
    resetDemo: () => Promise<void>;
    clearWorkspace: () => Promise<void>;
    updateSettings: (patch: Partial<WorkspaceSnapshot['settings']>) => Promise<void>;
  };
}

export function SettingsPage({ snapshot, demo, busy, actions }: SettingsProps) {
  const [settings, setSettings] = useState(snapshot.settings);
  const [importFile, setImportFile] = useState<File | null>(null);
  const patch = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => setSettings({ ...settings, [key]: value });
  return <>
    <header className="page-heading"><div><Eyebrow>WORKSPACE CONTROL</Eyebrow><h1>Settings</h1><p>Semester configuration, storage policy and data ownership controls.</p></div><div className="heading-actions"><Button variant="primary" disabled={busy} onClick={() => void actions.updateSettings(settings)}>{busy ? 'Saving…' : 'Save settings'}</Button></div></header>
    <div className="settings-layout">
      <Panel><PanelHead title="Semester identity" subtitle="Shown across the shared workspace" /><div className="settings-form"><label className="field"><span>Semester name</span><input value={settings.semesterName} onChange={(event) => patch('semesterName', event.target.value)} /></label><label className="field"><span>Subtitle</span><input value={settings.semesterSubtitle} onChange={(event) => patch('semesterSubtitle', event.target.value)} /></label><div className="form-row"><label className="field"><span>Timezone</span><input value={settings.timezone} readOnly /></label><label className="field"><span>Categories</span><input value={settings.projectCategories.join(', ')} onChange={(event) => patch('projectCategories', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label></div><label className="field field-check"><input type="checkbox" checked={settings.showActorDisclaimer} onChange={(event) => patch('showActorDisclaimer', event.target.checked)} /><span>Show reported-identity disclaimer</span></label><Button onClick={() => void actions.updateSettings(settings)}>Save identity</Button></div></Panel>
      <Panel><PanelHead title="Storage & versions" subtitle="Enforced on uploads and retained versions" /><div className="settings-form"><div className="form-row"><label className="field"><span>Max file size (MB)</span><input type="number" min={1} max={100} value={settings.maxFileSizeMb} onChange={(event) => patch('maxFileSizeMb', Number(event.target.value))} /></label><label className="field"><span>Soft limit (MB)</span><input type="number" min={10} max={10000} value={settings.storageSoftLimitMb} onChange={(event) => patch('storageSoftLimitMb', Number(event.target.value))} /></label></div><div className="form-row"><label className="field"><span>Warning threshold (%)</span><input type="number" min={1} max={100} value={settings.uploadWarningPercentage} onChange={(event) => patch('uploadWarningPercentage', Number(event.target.value))} /></label><label className="field"><span>Retained versions</span><input type="number" min={1} max={20} value={settings.maxRetainedVersions} onChange={(event) => patch('maxRetainedVersions', Number(event.target.value))} /></label></div><label className="field"><span>Status options</span><textarea rows={5} value={settings.statuses.map((status) => `${status.id}:${status.label}`).join('\n')} onChange={(event) => patch('statuses', event.target.value.split('\n').map((line) => { const [id, ...rest] = line.split(':'); return { id: id.trim(), label: rest.join(':').trim() || id.trim() }; }).filter((status) => status.id))} /></label><Button onClick={() => void actions.updateSettings(settings)}>Save policy</Button></div></Panel>
      <Panel><PanelHead title="Data" subtitle="Your workspace, your copies" /><div className="settings-data"><div className="data-row-settings"><span className="archive-icon"><Download size={17} /></span><div><b>Export workspace</b><small>Download a complete JSON snapshot. Files must be downloaded separately.</small></div><Button onClick={() => void actions.exportWorkspace()}>Export JSON</Button></div>
        <div className="data-row-settings"><span className="archive-icon"><CloudUpload size={17} /></span><div><b>Import workspace</b><small>Replace records from a previously exported Sky Vault JSON file.</small></div><label className="btn btn-secondary"><CloudUpload size={15} />Choose file<input type="file" accept="application/json,.json" hidden onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} /></label>{importFile && <Button variant="primary" disabled={busy} onClick={() => void actions.importWorkspace(importFile)}>Import {importFile.name}</Button>}</div>
        <div className="data-row-settings"><span className="archive-icon"><RotateCcw size={17} /></span><div><b>Reset Demo</b><small>{demo ? 'Restore the original seeded Semester 5 data in this browser.' : 'Reset the shared cloud workspace to its seeded demo data.'}</small></div><Button icon={RotateCcw} disabled={busy} onClick={() => { if (window.confirm('Reset the workspace to seeded demo data? Current changes will be replaced.')) void actions.resetDemo(); }}>Reset</Button></div>
        <div className="data-row-settings danger-zone"><span className="archive-icon"><Trash2 size={17} /></span><div><b>Clear workspace</b><small>Remove all workspace records. This requires explicit confirmation.</small></div><Button variant="danger" disabled={busy} onClick={() => { if (window.confirm('Type CLEAR WORKSPACE in the next prompt to confirm permanent removal.')) { const value = window.prompt('Type CLEAR WORKSPACE to confirm'); if (value === 'CLEAR WORKSPACE') void actions.clearWorkspace(); } }}>Clear</Button></div>
      </div></Panel>
    </div>
    <p className="identity-note">Current mode: <b>{demo ? 'Demo Mode · IndexedDB' : 'Cloud Mode · Firestore + Cloud Storage'}</b>. Cloud mode uses server-issued signed URLs and never exposes service account credentials to the browser.</p>
  </>;
}

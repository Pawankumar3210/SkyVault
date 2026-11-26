import { useState, type DragEvent } from 'react';
import { Archive, ArrowUpRight, Cloud, CloudUpload, Download, Eye, File as FileIcon, FileText, History, Pencil, Search, ShieldAlert } from 'lucide-react';
import { CATEGORY_LABELS } from '@shared/constants';
import { formatDateKey } from '@shared/dates';
import { formatBytes } from '@shared/files';
import type { DocumentCategory, DocumentRecord, DocumentVersion, WorkspaceSnapshot } from '@shared/types';
import { isDemoMode } from '../services/workspace';
import { humanStatus } from '../lib/format';
import { Badge, Button, EmptyState, Eyebrow, IconButton, Modal, Panel, Progress } from '../components/ui';

interface VaultProps {
  snapshot: WorkspaceSnapshot;
  actions: {
    upload: (files: File[] | FileList | null, category?: DocumentCategory) => Promise<void>;
    download: (document: DocumentRecord) => Promise<void>;
    preview: (document: DocumentRecord) => Promise<void>;
    replace: (document: DocumentRecord, file: File) => Promise<void>;
    rename: (document: DocumentRecord) => Promise<void>;
    restore: (document: DocumentRecord) => Promise<void>;
    restoreVersion: (document: DocumentRecord, version: DocumentVersion) => Promise<void>;
    remove: (document: DocumentRecord) => void;
  };
  busy: boolean;
  progress: number;
}

const categories: DocumentCategory[] = ['template', 'report', 'presentation', 'assignment', 'laboratory', 'reference'];

export function VaultPage({ snapshot, actions, busy, progress }: VaultProps) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<DocumentRecord | null>(null);
  const [dragging, setDragging] = useState(false);

  const documents = snapshot.documents.filter((doc) => (showTrash ? doc.isDeleted : !doc.isDeleted && !doc.isArchived)
    && doc.status === 'ready' && (category === 'all' || doc.category === category)
    && `${doc.displayName} ${doc.originalName} ${doc.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const storage = snapshot.documents.filter((doc) => doc.status === 'ready' && !doc.isDeleted).reduce((sum, doc) => sum + doc.sizeBytes, 0)
    + snapshot.versions.reduce((sum, version) => sum + version.sizeBytes, 0);
  const limit = snapshot.settings.storageSoftLimitMb * 1024 * 1024;
  const used = Math.min(100, Math.round(storage / limit * 100));
  const demo = isDemoMode();

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (files?.length) void actions.upload(files, category === 'all' ? 'other' : category as DocumentCategory);
  };

  return <>
    <header className="page-heading"><div><Eyebrow>PRIVATE DOCUMENT LIBRARY</Eyebrow><h1>Cloud Vault</h1><p>Templates, reports, presentations and references, organized by subject and project.</p></div>
      <div className="heading-actions"><Button icon={Archive} onClick={() => setShowTrash(!showTrash)}>{showTrash ? 'Back to files' : 'Trash'}</Button><label className={`btn btn-primary upload-button ${busy ? 'is-busy' : ''}`}><CloudUpload size={15} />{busy ? `Uploading ${progress}%` : 'Upload files'}<input type="file" multiple hidden disabled={busy} onChange={(event) => { void actions.upload(event.target.files, category === 'all' ? 'other' : category as DocumentCategory); event.target.value = ''; }} /></label></div>
    </header>

    <Panel className="storage-panel">
      <span className="storage-symbol"><Cloud size={20} /></span>
      <div className="storage-copy"><b>{demo ? 'Browser vault active' : 'Private Cloud Storage connected'}</b><p>{demo ? 'Demo files stay in this browser and are never presented as cloud uploads.' : 'Objects are private. Uploads and downloads use short-lived signed URLs generated on the server.'}</p><Progress value={used} /><div className="storage-meta"><span>{formatBytes(storage)} of {snapshot.settings.storageSoftLimitMb} MB soft limit</span><span>{snapshot.documents.filter((doc) => doc.status === 'ready' && !doc.isDeleted).length} files</span></div></div>
      <div className="storage-figure"><strong>{used}%</strong><small>used</small></div>
    </Panel>

    <label className={`drop-zone ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <CloudUpload size={22} /><span><b>Drop files to upload</b><small>PDF, Office, CSV, TXT, images or ZIP · {snapshot.settings.maxFileSizeMb} MB per file</small></span>
      <input type="file" multiple hidden onChange={(event) => { void actions.upload(event.target.files, category === 'all' ? 'other' : category as DocumentCategory); event.target.value = ''; }} />
    </label>

    <div className="vault-toolbar"><div className="category-tabs"><button className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>All files <em>{documents.length}</em></button>{categories.map((item) => <button className={category === item ? 'is-active' : ''} key={item} onClick={() => setCategory(item)}>{CATEGORY_LABELS[item]}</button>)}</div>
      <label className="search-field compact"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents…" /></label>
    </div>

    <Panel className="vault-panel">
      {documents.length ? <div className="table-scroll"><table className="data-table file-table"><thead><tr><th>Name</th><th>Category</th><th>Size</th><th>Version</th><th>Uploaded</th><th aria-label="Actions" /></tr></thead><tbody>{documents.map((doc) => {
        const versions = snapshot.versions.filter((version) => version.documentId === doc.id).sort((a, b) => b.version - a.version);
        return <tr className="data-row" key={doc.id}>
          <td><span className="name-cell"><span className="file-mark"><FileIcon size={16} /></span><span><b>{doc.displayName}</b><small>{doc.originalName} · {doc.uploadedByLabel}</small></span></span></td>
          <td><Badge>{humanStatus(doc.category)}</Badge></td><td>{formatBytes(doc.sizeBytes)}</td>
          <td><button className="version-button" onClick={() => setHistoryDoc(doc)}>v{doc.version}{versions.length ? ` · ${versions.length} old` : ''}</button></td>
          <td>{formatDateKey(doc.createdAt.slice(0, 10))}</td>
          <td><div className="row-tools">{showTrash ? <IconButton label={`Restore ${doc.displayName}`} icon={ArrowUpRight} className="tiny" onClick={() => void actions.restore(doc)} /> : <>
            <IconButton label={`Preview ${doc.displayName}`} icon={Eye} className="tiny" onClick={() => void actions.preview(doc)} />
            <IconButton label={`Download ${doc.displayName}`} icon={Download} className="tiny" onClick={() => void actions.download(doc)} />
            <label className="icon-btn tiny" title="Replace with a new version"><CloudUpload size={15} /><input type="file" hidden disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void actions.replace(doc, file); event.target.value = ''; }} /></label>
            <IconButton label={`Rename ${doc.displayName}`} icon={Pencil} className="tiny" onClick={() => void actions.rename(doc)} />
            <IconButton label={`Archive ${doc.displayName}`} icon={Archive} className="tiny danger" onClick={() => actions.remove(doc)} />
          </>}</div></td>
        </tr>;
      })}</tbody></table></div> : <EmptyState icon={FileText} title={showTrash ? 'Trash is empty' : 'Your vault is ready'} text={showTrash ? 'Soft-deleted documents appear here so they can be restored.' : 'Upload your first academic document, or drop files into the area above.'} />}
    </Panel>
    <p className="identity-note"><ShieldAlert size={14} /> Files are validated by extension, MIME type, size and content signature. Do not store sensitive personal information.</p>

    {historyDoc && <DocumentHistory document={historyDoc} versions={snapshot.versions.filter((version) => version.documentId === historyDoc.id).sort((a, b) => b.version - a.version)} onRestore={(version) => { void actions.restoreVersion(historyDoc, version); setHistoryDoc(null); }} onClose={() => setHistoryDoc(null)} />}
  </>;
}

function DocumentHistory({ document, versions, onRestore, onClose }: { document: DocumentRecord; versions: DocumentVersion[]; onRestore: (version: DocumentVersion) => void; onClose: () => void }) {
  return <Modal eyebrow="DOCUMENT HISTORY" title={document.displayName} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
    <div className="version-current"><span className="version-button">v{document.version} · Current</span><b>{document.originalName}</b><small>{formatBytes(document.sizeBytes)} · {document.uploadedByLabel}</small></div>
    {versions.length ? versions.map((version) => <div className="version-row" key={version.id}><History size={15} /><span><b>Version {version.version}</b><small>{version.originalName} · {formatBytes(version.sizeBytes)} · {formatDateKey(version.createdAt.slice(0, 10))}</small></span><Button onClick={() => onRestore(version)}>Restore</Button></div>) : <EmptyState title="Only the current version" text="Replace this document to start a version history." />}
  </Modal>;
}

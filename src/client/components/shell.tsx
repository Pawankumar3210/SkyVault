import type { ChangeEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Archive, ArrowUpRight, Bell, BookOpen, CalendarDays, CheckSquare, ChevronRight, Cloud, CloudUpload, Command, FileText, FolderKanban, LayoutDashboard, ListTodo, Menu, Moon, Plus, Search, Settings, ShieldCheck, Sun, Users, X, Zap, type LucideIcon } from 'lucide-react';
import type { Subject, WorkspaceSnapshot } from '@shared/types';
import { TERMINAL_STATUSES } from '@shared/constants';
import { classifyDeadline, formatDateKey } from '@shared/dates';
import { todayKey } from '../lib/format';
import type { ModalKind, Section } from '../contracts';
import { Button, EmptyState, Eyebrow, IconButton } from './ui';

interface NavItem { id: Section; label: string; icon: LucideIcon }
const navGroups: { label: string; items: NavItem[] }[] = [
  { label: 'Command', items: [
    { id: 'home', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'assignments', label: 'Assignments', icon: CheckSquare },
    { id: 'labs', label: 'Laboratory', icon: Zap },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  ] },
  { label: 'Workspace', items: [
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'vault', label: 'Cloud Vault', icon: Cloud },
    { id: 'templates', label: 'Template Library', icon: FileText },
    { id: 'checklists', label: 'Checklists', icon: ListTodo },
  ] },
  { label: 'Intelligence', items: [
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'activity', label: 'Activity history', icon: ListTodo },
    { id: 'archive', label: 'Archive', icon: Archive },
  ] },
];

export const sectionTitles: Record<Section, string> = {
  home: 'Overview', projects: 'Projects', assignments: 'Assignments', labs: 'Laboratory', subjects: 'Subjects', team: 'Team',
  vault: 'Cloud Vault', templates: 'Template Library', checklists: 'Checklists', calendar: 'Calendar', analytics: 'Analytics', archive: 'Archive',
  settings: 'Settings', activity: 'Activity history',
};

export interface SearchHit { id: string; title: string; subtitle: string; href: string; icon: LucideIcon }

interface ShellProps {
  children: ReactNode;
  snapshot: WorkspaceSnapshot;
  section: Section;
  activeProjectCount: number;
  demo: boolean;
  dark: boolean;
  actorId: string;
  mobileNav: boolean;
  collapsed: boolean;
  searchOpen: boolean;
  searchQuery: string;
  searchHits: SearchHit[];
  notificationsOpen: boolean;
  quickOpen: boolean;
  setMobileNav: (value: boolean) => void;
  onToggleNav: () => void;
  setDark: (value: boolean) => void;
  setActorId: (value: string) => void;
  setSearchOpen: (value: boolean) => void;
  setSearchQuery: (value: string) => void;
  setNotificationsOpen: (value: boolean) => void;
  setQuickOpen: (value: boolean) => void;
  navigate: (path: string) => void;
  openModal: (kind: Exclude<ModalKind, null>) => void;
  uploadFiles: (files: File[] | FileList | null) => Promise<void>;
  currentTitle?: string;
  selectedWorkSubject?: Subject;
}

export function Shell(props: ShellProps) {
  const { children, snapshot, section, activeProjectCount, demo, dark, actorId, mobileNav, collapsed, searchOpen, searchQuery, searchHits,
    notificationsOpen, quickOpen, setMobileNav, onToggleNav, setDark, setActorId, setSearchOpen, setSearchQuery, setNotificationsOpen,
    setQuickOpen, navigate, openModal, uploadFiles, currentTitle, selectedWorkSubject } = props;

  const go = (path: string) => { navigate(path); setMobileNav(false); setSearchOpen(false); setQuickOpen(false); setNotificationsOpen(false); };
  const breadcrumb = currentTitle ?? sectionTitles[section];
  const navHidden = mobileNav || collapsed;

  return <div className={`app-frame ${collapsed ? 'is-collapsed' : ''}`}>
    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
      <button className="brand" onClick={() => go('/')} aria-label="Sky Vault overview">
        <span className="brand-symbol" aria-hidden="true"><img src="/favicon.svg" alt="" /></span>
        <span className="brand-copy"><strong>SKY VAULT</strong><small>ACADEMIC COMMAND</small></span>
      </button>

      <button className="semester-tile" onClick={() => go('/settings')} title="Open workspace settings">
        <span className="semester-code">S5</span>
        <span className="semester-copy"><b>Semester 5</b><small>Shared workspace</small></span>
        <ArrowUpRight size={14} />
      </button>

      <div className="shared-note"><span className="pulse" /><span>Changes are visible to everyone.</span></div>

      <nav className="side-nav" aria-label="Primary">
        {navGroups.map((group) => <div className="nav-group" key={group.label}>
          <div className="nav-caption">{group.label}</div>
          {group.items.map(({ id, label, icon: Icon }) => <Link key={id} to={`/${id === 'home' ? '' : id}`} className={`nav-link ${section === id ? 'is-active' : ''}`} onClick={() => { setMobileNav(false); setSearchOpen(false); setQuickOpen(false); setNotificationsOpen(false); }} aria-current={section === id ? 'page' : undefined}>
            <Icon size={16} strokeWidth={1.8} /><span>{label}</span>{id === 'projects' && activeProjectCount > 0 && <em>{activeProjectCount}</em>}
          </Link>)}
        </div>)}
      </nav>

      <div className="sidebar-foot">
        <Link className={`nav-link ${section === 'settings' ? 'is-active' : ''}`} to="/settings" onClick={() => { setMobileNav(false); setSearchOpen(false); setQuickOpen(false); setNotificationsOpen(false); }}><Settings size={16} strokeWidth={1.8} /><span>Settings</span></Link>
        <div className="mode-tile"><span className={`mode-symbol ${demo ? 'is-demo' : ''}`}><Cloud size={16} /></span><span><b>{demo ? 'Demo mode' : 'Cloud mode'}</b><small>{demo ? 'Stored in this browser' : 'Firestore + Cloud Storage'}</small></span><i className={demo ? 'is-demo' : ''} /></div>
      </div>
    </aside>

    <div className="main-frame">
      <header className="topbar">
        <IconButton className={`nav-toggle ${navHidden ? 'is-on' : ''}`} label={navHidden ? 'Close navigation' : 'Open navigation'} icon={Menu} onClick={onToggleNav} />
        <div className="breadcrumb"><button onClick={() => go('/')}>Semester 5</button><ChevronRight size={13} /><span>{breadcrumb}</span></div>
        <div className="topbar-actions">
          <button className="search-trigger" onClick={() => setSearchOpen(!searchOpen)} aria-expanded={searchOpen}><Search size={15} /><span>Search workspace</span><kbd>⌘K</kbd></button>
          <label className="actor-select" title="Selected teammate is a reported label, not a verified identity"><Users size={14} /><select aria-label="Reported as" value={actorId} onChange={(event) => setActorId(event.target.value)}><option value="">Reported as…</option>{snapshot.members.filter((member) => !member.isDeleted).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
          <IconButton label={dark ? 'Switch to light theme' : 'Switch to dark theme'} icon={dark ? Sun : Moon} onClick={() => setDark(!dark)} />
          <IconButton label="Deadline notices" icon={Bell} onClick={() => setNotificationsOpen(!notificationsOpen)} className={notificationsOpen ? 'is-on' : ''} />
          <Button variant="primary" icon={Plus} onClick={() => setQuickOpen(true)}>Quick create</Button>
        </div>
      </header>

      {searchOpen && <SearchPalette query={searchQuery} setQuery={setSearchQuery} hits={searchHits} onPick={(hit) => go(hit.href)} onClose={() => setSearchOpen(false)} />}
      {notificationsOpen && <NoticePanel snapshot={snapshot} onClose={() => setNotificationsOpen(false)} onOpen={go} />}
      {quickOpen && <QuickCreate onPick={(kind) => { setQuickOpen(false); if (kind === 'upload') return; openModal(kind); }} onUpload={(files) => { void uploadFiles(files); setQuickOpen(false); }} onClose={() => setQuickOpen(false)} />}

      <main className="page-content">{children}</main>
      <footer className="app-footnote"><ShieldCheck size={13} /> Public shared workspace · reported teammate names are not verified identities · {selectedWorkSubject?.code ?? 'Semester 5'}</footer>
    </div>
  </div>;
}

function SearchPalette({ query, setQuery, hits, onPick, onClose }: { query: string; setQuery: (value: string) => void; hits: SearchHit[]; onPick: (hit: SearchHit) => void; onClose: () => void }) {
  return <div className="popover search-popover" role="dialog" aria-label="Search workspace">
    <div className="search-field"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subjects, work, people, tasks, files…" onKeyDown={(event) => { if (event.key === 'Enter' && hits[0]) onPick(hits[0]); if (event.key === 'Escape') onClose(); }} /><kbd>ESC</kbd></div>
    <div className="popover-body">
      {!query.trim() && <div className="search-hint"><Command size={15} /><span>Type to search the shared Semester 5 workspace.</span></div>}
      {query.trim() && !hits.length && <EmptyState title="No matches" text="Nothing in this workspace matches that search." />}
      {hits.map((hit) => <button className="search-result" key={hit.id} onClick={() => onPick(hit)}><span className="result-icon"><hit.icon size={15} /></span><span className="result-copy"><b>{hit.title}</b><small>{hit.subtitle}</small></span><ArrowUpRight size={14} /></button>)}
    </div>
  </div>;
}

function NoticePanel({ snapshot, onClose, onOpen }: { snapshot: WorkspaceSnapshot; onClose: () => void; onOpen: (path: string) => void }) {
  const key = todayKey();
  const notices = [
    ...snapshot.workItems.filter((item) => !item.isDeleted && !item.isArchived && !TERMINAL_STATUSES.has(item.status) && ['overdue', 'today', 'three'].includes(classifyDeadline(item.dueDate, item.status, key, TERMINAL_STATUSES))).map((item) => ({ id: item.id, title: item.title, due: item.dueDate!, type: item.dueDate! < key ? 'Overdue' : 'Due soon', path: `/projects/${item.id}` })),
    ...snapshot.tasks.filter((task) => !task.isDeleted && task.status !== 'done' && task.dueDate && task.dueDate <= key).map((task) => ({ id: task.id, title: task.title, due: task.dueDate!, type: 'Task due', path: `/projects/${task.workItemId}` })),
  ].sort((a, b) => a.due.localeCompare(b.due));
  return <div className="popover notice-popover" role="dialog" aria-label="Deadline notices">
    <div className="popover-head"><Eyebrow>NOTICES</Eyebrow><h2>Deadline watch</h2><IconButton label="Close notices" icon={X} onClick={onClose} /></div>
    <p className="popover-note">Derived from current records, not a notification service.</p>
    <div className="popover-body">
      {notices.length ? notices.slice(0, 8).map((notice) => <button className="notice-row" key={`${notice.type}-${notice.id}`} onClick={() => onOpen(notice.path)}><span className="notice-icon"><CalendarDays size={15} /></span><span className="notice-copy"><b>{notice.title}</b><small>{notice.type} · {formatDateKey(notice.due)}</small></span><ChevronRight size={14} /></button>) : <EmptyState title="Clear horizon" text="No work or tasks are due in the next three days." />}
    </div>
  </div>;
}

function QuickCreate({ onPick, onUpload, onClose }: { onPick: (kind: Exclude<ModalKind, null> | 'upload') => void; onUpload: (files: File[] | FileList | null) => void; onClose: () => void }) {
  const options: { kind: Exclude<ModalKind, null> | 'upload'; label: string; detail: string; icon: LucideIcon }[] = [
    { kind: 'project', label: 'New project', detail: 'Group or individual work', icon: FolderKanban },
    { kind: 'assignment', label: 'New assignment', detail: 'Coursework with a deadline', icon: CheckSquare },
    { kind: 'lab', label: 'Lab activity', detail: 'Experiment or practical', icon: Zap },
    { kind: 'task', label: 'Team task', detail: 'Assign a responsibility', icon: ListTodo },
    { kind: 'subject', label: 'New subject', detail: 'Add to Semester 5', icon: BookOpen },
    { kind: 'member', label: 'New teammate', detail: 'Add to the directory', icon: Users },
    { kind: 'template', label: 'New template', detail: 'Reusable college format', icon: FileText },
    { kind: 'upload', label: 'Upload document', detail: 'Add to the Cloud Vault', icon: CloudUpload },
  ];
  return <div className="scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="quick-menu" role="dialog" aria-modal="true" aria-label="Quick create">
      <div className="dialog-head"><div><Eyebrow>QUICK CREATE</Eyebrow><h2>What are you adding?</h2></div><IconButton label="Close" icon={X} onClick={onClose} /></div>
      <div className="quick-grid">{options.map(({ kind, label, detail, icon: Icon }) => kind === 'upload'
        ? <label className="quick-option" key={kind}><span className="quick-icon"><Icon size={17} /></span><span><b>{label}</b><small>{detail}</small></span><input type="file" multiple hidden onChange={(event: ChangeEvent<HTMLInputElement>) => onUpload(event.target.files)} /></label>
        : <button className="quick-option" key={kind} onClick={() => onPick(kind)}><span className="quick-icon"><Icon size={17} /></span><span><b>{label}</b><small>{detail}</small></span><Plus size={14} /></button>)}</div>
      <div className="quick-foot"><Search size={13} /> Press <kbd>⌘</kbd><kbd>K</kbd> to search everything</div>
    </div>
  </div>;
}

import type { ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: LucideIcon;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  title?: string;
  form?: string;
}

export function Button({ children, onClick, variant = 'secondary', icon: Icon, type = 'button', disabled = false, className = '', title, form }: ButtonProps) {
  return <button type={type} form={form} title={title} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={15} strokeWidth={1.9} />}{children}</button>;
}

export function IconButton({ label, icon: Icon, onClick, className = '', disabled = false, title }: { label: string; icon: LucideIcon; onClick?: () => void; className?: string; disabled?: boolean; title?: string }) {
  return <button type="button" className={`icon-btn ${className}`} aria-label={label} title={title ?? label} onClick={onClick} disabled={disabled}><Icon size={16} strokeWidth={1.9} /></button>;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PanelHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="panel-action">{action}</div>}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow"><span className="eyebrow-rule" />{children}</div>;
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-heading"><div><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</header>;
}

export function TextLink({ children, onClick, danger = false }: { children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return <button type="button" className={`text-link ${danger ? 'danger' : ''}`} onClick={onClick}>{children}</button>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Progress({ value, color, className = '' }: { value: number; color?: string; className?: string }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return <div className={`progress ${className}`} role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${safe}%`, background: color }} /></div>;
}

export function EmptyState({ title, text, action, icon: Icon }: { title: string; text: string; action?: ReactNode; icon?: LucideIcon }) {
  return <div className="empty-state"><span className="empty-mark">{Icon && <Icon size={20} strokeWidth={1.7} />}</span><b>{title}</b><p>{text}</p>{action}</div>;
}

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
  return <span className={`avatar ${className}`} aria-hidden="true">{letters}</span>;
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${status}`}><i />{humanize(status)}</span>;
}

export function PriorityPill({ priority }: { priority: string }) {
  return <span className={`priority-pill priority-${priority}`}><i />{humanize(priority)}</span>;
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Modal({ eyebrow = 'SEMESTER 5 WORKSPACE', title, onClose, children, footer, wide = false }: { eyebrow?: string; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>();
  return <div className="scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
      <div className="dialog-head"><div><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2></div><IconButton label="Close dialog" icon={X} onClick={onClose} /></div>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </div>
  </div>;
}

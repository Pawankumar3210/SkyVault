import { MoreHorizontal, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import type { TeamMember, WorkspaceSnapshot } from '@shared/types';
import { Avatar, Button, EmptyState, Eyebrow, IconButton, Panel } from '../components/ui';

export function TeamPage({ snapshot, onAdd, onEdit, onDelete }: { snapshot: WorkspaceSnapshot; onAdd: () => void; onEdit: (member: TeamMember) => void; onDelete: (member: TeamMember) => void }) {
  const members = snapshot.members.filter((member) => !member.isDeleted);
  const openTasks = snapshot.tasks.filter((task) => !task.isDeleted && task.status !== 'done');
  return <>
    <header className="page-heading"><div><Eyebrow>COLLABORATION</Eyebrow><h1>Team directory</h1><p>People, roles and assigned responsibilities across Semester 5.</p></div><div className="heading-actions"><Button variant="primary" icon={Plus} onClick={onAdd}>Add teammate</Button></div></header>
    <div className="summary-strip team-summary">
      <div className="summary-strip-lead"><div className="avatar-stack">{members.slice(0, 5).map((member) => <Avatar key={member.id} name={member.name} />)}</div><span><small>Directory</small><b>{members.length} teammates</b></span></div>
      <div className="summary-stats"><span><b>{openTasks.length}</b><small>Open tasks</small></span><span><b>{snapshot.workItems.filter((item) => item.teamMemberIds.length > 0 && !item.isDeleted).length}</b><small>Team projects</small></span><span><b>{snapshot.tasks.filter((task) => task.status === 'done' && !task.isDeleted).length}</b><small>Tasks done</small></span></div>
    </div>
    <div className="card-grid team-cards">{members.map((member) => {
      const tasks = snapshot.tasks.filter((task) => task.assignedMemberId === member.id && !task.isDeleted);
      const open = tasks.filter((task) => task.status !== 'done').length;
      const projects = snapshot.workItems.filter((item) => item.teamMemberIds.includes(member.id) && !item.isDeleted).length;
      return <article className="person-card-large" key={member.id}>
        <div className="person-card-head"><Avatar name={member.name} /><div className="subject-card-tools"><IconButton label={`Edit ${member.name}`} icon={MoreHorizontal} className="tiny" onClick={() => onEdit(member)} /><IconButton label={`Remove ${member.name}`} icon={Trash2} className="tiny danger" onClick={() => onDelete(member)} /></div></div>
        <h2>{member.name}</h2><p className="person-role">{member.academicRole || 'Semester teammate'}</p>
        <div className="person-contact">{member.email ? <a href={`mailto:${member.email}`}>{member.email}</a> : <span>No contact details</span>}</div>
        <div className="tag-row">{member.skills.length ? member.skills.slice(0, 4).map((skill) => <span className="chip" key={skill}>{skill}</span>) : <span className="muted">Skills not listed</span>}</div>
        <div className="person-metrics"><span><b>{projects}</b><small>Projects</small></span><span><b>{tasks.length}</b><small>Tasks</small></span><span><b>{open}</b><small>Open</small></span></div>
      </article>;
    })}</div>
    {!members.length && <Panel><EmptyState title="Build your team directory" text="Add teammates to assign work and track responsibilities." action={<Button variant="primary" icon={Plus} onClick={onAdd}>Add teammate</Button>} /></Panel>}
    <p className="identity-note"><ShieldAlert size={14} /> Names, roles and workload are self-reported in this public workspace. They do not verify identity or contribution.</p>
  </>;
}

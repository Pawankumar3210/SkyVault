import type { SearchHit, WorkspaceSnapshot } from './types';

export interface AssistantAnswer {
  title: string;
  lines: string[];
  hits: SearchHit[];
}

export function answerQuestion(snapshot: WorkspaceSnapshot, question: string, todayKey: string): AssistantAnswer {
  const q = question.toLowerCase();
  const open = snapshot.workItems.filter((item) => !item.isDeleted && !item.isArchived && item.status !== 'completed' && item.status !== 'submitted');
  if (q.includes('overdue')) {
    const items = open.filter((item) => item.dueDate && item.dueDate < todayKey);
    return {
      title: 'Overdue work',
      lines: items.length ? items.map((item) => `${item.title} was due ${item.dueDate}.`) : ['Nothing open is past its due date.'],
      hits: items.map((item) => toHit(item)),
    };
  }
  if (q.includes('deadline') || q.includes('upcoming') || q.includes('due')) {
    const items = open
      .filter((item) => item.dueDate && item.dueDate >= todayKey)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .slice(0, 6);
    return {
      title: 'Upcoming deadlines',
      lines: items.length ? items.map((item) => `${item.title} is due ${item.dueDate}.`) : ['No upcoming dated work is open.'],
      hits: items.map((item) => toHit(item)),
    };
  }
  if (q.includes('incomplete') || q.includes('not complete')) {
    const items = open.filter((item) => item.type === 'project');
    return {
      title: 'Incomplete projects',
      lines: items.length ? items.map((item) => `${item.title} is ${item.status.replaceAll('_', ' ')} at ${item.progress}%.`) : ['Every project is completed or submitted.'],
      hits: items.map((item) => toHit(item)),
    };
  }
  if (q.includes('checklist')) {
    const missing = snapshot.workItems.filter((item) => item.type === 'project' && !item.isDeleted && !snapshot.checklists.some((list) => list.workItemId === item.id && !list.isDeleted));
    return {
      title: 'Projects without a checklist',
      lines: missing.length ? missing.map((item) => `${item.title} has no submission checklist yet.`) : ['Every project has at least one checklist.'],
      hits: missing.map((item) => toHit(item)),
    };
  }
  const member = snapshot.members.find((person) => !person.isDeleted && q.includes(person.name.toLowerCase().split(' ')[0].toLowerCase()));
  if (member && (q.includes('task') || q.includes('assigned'))) {
    const tasks = snapshot.tasks.filter((task) => !task.isDeleted && task.assignedMemberId === member.id);
    return {
      title: `Tasks assigned to ${member.name}`,
      lines: tasks.length ? tasks.map((task) => `${task.title} is ${task.status.replaceAll('_', ' ')}.`) : [`No tasks are assigned to ${member.name}.`],
      hits: tasks.map((task) => ({ id: task.id, type: 'task' as const, title: task.title, subtitle: member.name, href: `/projects/${task.workItemId}?tab=tasks` })),
    };
  }
  const subject = snapshot.subjects.find((item) => !item.isDeleted && (q.includes(item.name.toLowerCase()) || q.includes(item.code.toLowerCase())));
  if (subject && q.includes('document')) {
    const docs = snapshot.documents.filter((document) => !document.isDeleted && document.status === 'ready' && document.subjectId === subject.id);
    return {
      title: `${subject.code} documents`,
      lines: docs.length ? docs.map((document) => document.displayName) : [`No ready documents are linked to ${subject.name}.`],
      hits: docs.map((document) => ({ id: document.id, type: 'document' as const, title: document.displayName, subtitle: subject.code, href: `/vault?doc=${document.id}` })),
    };
  }
  return {
    title: 'Try a workspace question',
    lines: [
      'Ask about upcoming deadlines, overdue work, incomplete projects, a teammate’s assigned tasks, documents for a subject, or missing report checklists.',
      'Answers come only from records stored in this workspace.',
    ],
    hits: [],
  };
}

function toHit(item: { id: string; title: string; type: string }): SearchHit {
  return {
    id: item.id,
    type: item.type === 'project' ? 'project' : item.type === 'lab' ? 'lab' : 'assignment',
    title: item.title,
    subtitle: item.type,
    href: item.type === 'project' ? `/projects/${item.id}` : `/work/${item.id}`,
  };
}

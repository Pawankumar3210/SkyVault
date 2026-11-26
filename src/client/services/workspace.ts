import { openDB } from 'idb';
import { buildSemesterSeed, defaultSettings } from '@shared/seed';
import type { WorkspaceSnapshot } from '@shared/types';

const demo = import.meta.env.VITE_APP_MODE !== 'cloud';
const dbPromise = openDB('sky-vault-sem5', 1, {
  upgrade(db) {
    db.createObjectStore('state');
    db.createObjectStore('files');
  },
});

export class WorkspaceError extends Error {
  constructor(message: string, public code = 'REQUEST_FAILED') { super(message); }
}

export async function loadWorkspace(): Promise<WorkspaceSnapshot> {
  if (!demo) return request<WorkspaceSnapshot>('/workspace');
  const db = await dbPromise;
  const existing = await db.get('state', 'workspace') as WorkspaceSnapshot | undefined;
  if (existing) return existing;
  const seeded = buildSemesterSeed(new Date());
  await db.put('state', seeded.snapshot, 'workspace');
  for (const file of seeded.files) await db.put('files', new Blob([file.bytes.slice().buffer as ArrayBuffer], { type: file.document.mimeType }), file.document.storageObjectPath);
  return seeded.snapshot;
}

export async function saveDemo(snapshot: WorkspaceSnapshot) {
  if (!demo) throw new WorkspaceError('Local workspace updates are disabled in Cloud Mode.');
  const db = await dbPromise;
  await db.put('state', snapshot, 'workspace');
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: { message?: string } } | null;
  if (!response.ok || !body?.success) throw new WorkspaceError(body?.error?.message || `Request failed (${response.status}).`);
  return body.data as T;
}

export async function putDemoFile(path: string, file: Blob) {
  const db = await dbPromise;
  await db.put('files', file, path);
}

export async function getDemoFile(path: string) {
  const db = await dbPromise;
  return await db.get('files', path) as Blob | undefined;
}

export async function resetDemoWorkspace(): Promise<WorkspaceSnapshot | null> {
  if (!demo) return null;
  const db = await dbPromise;
  await db.clear('files');
  await db.clear('state');
  return loadWorkspace();
}

export async function clearDemoWorkspace(): Promise<WorkspaceSnapshot | null> {
  if (!demo) return null;
  const db = await dbPromise;
  await db.clear('files');
  const empty: WorkspaceSnapshot = {
    subjects: [], workItems: [], tasks: [], members: [], documents: [], versions: [], templates: [], checklists: [], activities: [], notifications: [],
    settings: defaultSettings(new Date().toISOString()),
  };
  await db.put('state', empty, 'workspace');
  return empty;
}

export function isDemoMode() { return demo; }

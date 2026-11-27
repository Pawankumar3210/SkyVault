import { afterAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import app from '../../api/index';
import { loadConfig } from '../../src/server/config';
import { WorkspaceService } from '../../src/server/service';
import { MemoryObjectStorage, PENDING_UPLOAD_PREFIX } from '../../src/server/storage/memory';
import { MemoryStore } from '../../src/server/store/memory';
import { newDocument } from '../../src/shared/factory';
import type { DocumentRecord } from '../../src/shared/types';

const api = supertest(app);

function localService() {
  const store = new MemoryStore();
  const objects = new MemoryObjectStorage();
  const config = { ...loadConfig({ APP_MODE: 'demo' }), pendingUploadTtlSeconds: 1 };
  return { store, objects, service: new WorkspaceService(store, objects, config) };
}

describe('REST API in Demo Mode', () => {
  it('reports the active backend mode without login', async () => {
    const response = await api.get('/api/health').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.mode).toBe('demo');
  });

  it('validates and creates a subject', async () => {
    const response = await api.post('/api/subjects').send({ name: 'Integration subject', code: 'INT', color: '#123456' }).expect(200);
    expect(response.body.data.name).toBe('Integration subject');
    const list = await api.get('/api/subjects').expect(200);
    expect(list.body.data.some((subject: { code: string }) => subject.code === 'INT')).toBe(true);
  });

  it('rejects invalid subject payloads', async () => {
    const response = await api.post('/api/subjects').send({ name: '', code: 'TOO-LONG-FOR-THIS-CODE', color: 'red' }).expect(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a patch with a stale expectedUpdatedAt', async () => {
    const created = await api.post('/api/subjects').send({ name: 'Conflict subject', code: 'CFL', color: '#654321' }).expect(200);
    const original = created.body.data;
    await api.patch(`/api/subjects/${original.id}`).send({ name: 'First edit', expectedUpdatedAt: original.updatedAt }).expect(200);
    const stale = await api.patch(`/api/subjects/${original.id}`).send({ name: 'Second edit', expectedUpdatedAt: original.updatedAt }).expect(409);
    expect(stale.body.error.code).toBe('CONFLICT');
    const list = await api.get('/api/subjects').expect(200);
    expect(list.body.data.find((subject: { id: string }) => subject.id === original.id).name).toBe('First edit');
  });

  it('restores soft-deleted teammates and templates', async () => {
    const member = await api.post('/api/team-members').send({ name: 'Restore teammate' }).expect(200);
    await api.delete(`/api/team-members/${member.body.data.id}`).send({}).expect(200);
    await api.post(`/api/team-members/${member.body.data.id}/restore`).send({}).expect(200);
    const members = await api.get('/api/team-members').expect(200);
    expect(members.body.data.some((row: { id: string }) => row.id === member.body.data.id)).toBe(true);

    const template = await api.post('/api/templates').send({ name: 'Restore template', templateCategory: 'other' }).expect(200);
    await api.delete(`/api/templates/${template.body.data.id}`).expect(200);
    await api.post(`/api/templates/${template.body.data.id}/restore`).send({}).expect(200);
    const templates = await api.get('/api/templates').expect(200);
    expect(templates.body.data.some((row: { id: string }) => row.id === template.body.data.id)).toBe(true);
  });

  it('runs maintenance cleanup through the API', async () => {
    const response = await api.post('/api/maintenance/cleanup').send({}).expect(200);
    expect(response.body.data.backups.removed).toBeGreaterThanOrEqual(0);
    expect(response.body.data.uploads.ttlSeconds).toBeGreaterThan(0);
  });
});

describe('Cloud-hardening service behavior', () => {
  it('fails stale pending documents without touching ready objects', async () => {
    const { store, objects, service } = localService();
    const old = new Date(Date.now() - 60_000).toISOString();
    const stalePath = `${PENDING_UPLOAD_PREFIX}stale/doc/stale.txt`;
    const readyPath = `${PENDING_UPLOAD_PREFIX}ready/doc/ready.txt`;
    await objects.save(stalePath, new Uint8Array([1, 2, 3]), 'text/plain');
    await objects.save(readyPath, new Uint8Array([4, 5, 6]), 'text/plain');
    const stale = newDocument({
      displayName: 'Stale upload', originalName: 'stale.txt', category: 'other', mimeType: 'text/plain',
      sizeBytes: 3, path: stalePath, storageMode: 'indexeddb', actor: { memberId: null, displayName: 'Test' },
    }, old);
    const ready = newDocument({
      displayName: 'Ready file', originalName: 'ready.txt', category: 'other', mimeType: 'text/plain',
      sizeBytes: 3, path: readyPath, storageMode: 'indexeddb', actor: { memberId: null, displayName: 'Test' },
    }, old);
    await store.save('documents', { ...stale, createdAt: old, updatedAt: old });
    await store.save('documents', {
      ...ready, status: 'ready', pendingPath: null, pendingOriginalName: null,
      pendingMimeType: null, pendingSizeBytes: null, createdAt: old, updatedAt: old,
    });
    const result = await service.cleanupPendingUploads();
    expect(result.markedFailed).toBe(1);
    expect((await store.get<DocumentRecord>('documents', stale.id))?.status).toBe('failed');
    expect(await objects.stat(stalePath)).toBeNull();
    expect((await store.get<DocumentRecord>('documents', ready.id))?.status).toBe('ready');
    expect(await objects.stat(readyPath)).not.toBeNull();
  });

  it('creates automatic backups before destructive flows and restores snapshots', async () => {
    const { service } = localService();
    const subject = await service.createSubject({ name: 'Backup subject', code: 'BAK', color: '#123456' }, {});
    const backup = await service.createBackup('test');
    await service.deleteSubject(subject.id);
    expect(await service.listSubjects()).toHaveLength(0);
    const restored = await service.restoreBackup(backup.id);
    expect(restored.restored).toBe(true);
    expect((await service.getSubject(subject.id)).name).toBe('Backup subject');
    await service.clearWorkspace('CLEAR WORKSPACE');
    const backups = await service.listBackups();
    expect(backups.some((row) => row.reason === 'before_clear')).toBe(true);
  });
});

afterAll(() => { /* Express is exported as a function and does not open a listening socket in tests. */ });

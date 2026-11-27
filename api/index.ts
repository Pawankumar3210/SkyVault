import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig } from '../src/server/config';
import { ApiError, ok } from '../src/server/http';
import { WorkspaceService } from '../src/server/service';
import { MemoryStore } from '../src/server/store/memory';
import { FirestoreStore } from '../src/server/store/firestore';
import { MemoryObjectStorage } from '../src/server/storage/memory';
import { GcsObjectStorage } from '../src/server/storage/gcs';
import type { ObjectStorage } from '../src/server/storage/memory';

const config = loadConfig();
const store = config.mode === 'cloud' && config.problems.length === 0 ? new FirestoreStore(config) : new MemoryStore();
const objects: ObjectStorage = config.mode === 'cloud' && config.problems.length === 0 ? new GcsObjectStorage(config) : new MemoryObjectStorage();
const service = new WorkspaceService(store, objects, config);
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-Sky-Vault-Actor'] }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use((req, res, next) => {
  const rewrittenRoute = typeof req.query.route === 'string' ? req.query.route : '';
  if (rewrittenRoute.startsWith('/')) req.url = `/api${rewrittenRoute}`;
  if (config.mode === 'cloud' && config.problems.length && req.path !== '/api/health') {
    res.status(503).json({ success: false, error: { code: 'CLOUD_CONFIGURATION_ERROR', message: config.problems.join(' ') } });
    return;
  }
  next();
});

function actor(req: Request) {
  const memberId = typeof req.body?.actor?.memberId === 'string' ? req.body.actor.memberId : undefined;
  const displayName = typeof req.body?.actor?.displayName === 'string' ? req.body.actor.displayName.slice(0, 80) : undefined;
  return { memberId, displayName };
}
function id(req: Request) { return String(req.params.id ?? ''); }
function query(req: Request) { return Object.fromEntries(Object.entries(req.query).map(([key, value]) => [key, typeof value === 'string' ? value : undefined])); }
function send<T>(res: Response, data: T, message?: string) { res.json(ok(data, message)); }

app.get('/api/health', (_req, res) => send(res, { mode: config.mode, configured: config.problems.length === 0, problems: config.problems, storage: objects.kind }));
app.get('/api/workspace', async (_req, res, next) => { try { send(res, await service.snapshot()); } catch (error) { next(error); } });
app.get('/api/settings', async (_req, res, next) => { try { send(res, await service.settings()); } catch (error) { next(error); } });
app.patch('/api/settings', async (req, res, next) => { try { send(res, await service.updateSettings(req.body)); } catch (error) { next(error); } });
app.get('/api/workspace/backups', async (_req, res, next) => { try { send(res, await service.listBackups()); } catch (error) { next(error); } });
app.post('/api/workspace/backup', async (req, res, next) => { try { send(res, await service.createBackup(typeof req.body?.reason === 'string' ? req.body.reason : 'manual'), 'Workspace backup created'); } catch (error) { next(error); } });
app.post('/api/workspace/restore', async (req, res, next) => { try { send(res, await service.restoreBackup(String(req.body?.backupId ?? '')), 'Workspace backup restored'); } catch (error) { next(error); } });
app.get('/api/subjects', async (_req, res, next) => { try { send(res, await service.listSubjects()); } catch (error) { next(error); } });
app.post('/api/subjects', async (req, res, next) => { try { send(res, await service.createSubject(req.body, actor(req)), 'Subject created'); } catch (error) { next(error); } });
app.patch('/api/subjects/:id', async (req, res, next) => { try { send(res, await service.updateSubject(id(req), req.body)); } catch (error) { next(error); } });
app.delete('/api/subjects/:id', async (req, res, next) => { try { send(res, await service.deleteSubject(id(req))); } catch (error) { next(error); } });
app.post('/api/subjects/:id/restore', async (req, res, next) => { try { send(res, await service.restoreSubject(id(req))); } catch (error) { next(error); } });
app.get('/api/work-items', async (req, res, next) => { try { send(res, await service.listWorkItems(query(req))); } catch (error) { next(error); } });
app.post('/api/work-items', async (req, res, next) => { try { send(res, await service.createWorkItem(req.body, actor(req)), 'Academic work created'); } catch (error) { next(error); } });
app.get('/api/work-items/:id', async (req, res, next) => { try { send(res, await service.getWorkItem(id(req))); } catch (error) { next(error); } });
app.patch('/api/work-items/:id', async (req, res, next) => { try { send(res, await service.updateWorkItem(id(req), req.body, actor(req))); } catch (error) { next(error); } });
app.delete('/api/work-items/:id', async (req, res, next) => { try { send(res, await service.deleteWorkItem(id(req))); } catch (error) { next(error); } });
app.post('/api/work-items/:id/restore', async (req, res, next) => { try { send(res, await service.restoreWorkItem(id(req))); } catch (error) { next(error); } });
app.get('/api/tasks', async (req, res, next) => { try { send(res, await service.listTasks(typeof req.query.workItemId === 'string' ? req.query.workItemId : undefined)); } catch (error) { next(error); } });
app.post('/api/tasks', async (req, res, next) => { try { send(res, await service.createTask(req.body, actor(req))); } catch (error) { next(error); } });
app.patch('/api/tasks/:id', async (req, res, next) => { try { send(res, await service.updateTask(id(req), req.body, actor(req))); } catch (error) { next(error); } });
app.delete('/api/tasks/:id', async (req, res, next) => { try { send(res, await service.deleteTask(id(req))); } catch (error) { next(error); } });
app.get('/api/team-members', async (_req, res, next) => { try { send(res, await service.listMembers()); } catch (error) { next(error); } });
app.post('/api/team-members', async (req, res, next) => { try { send(res, await service.createMember(req.body, actor(req))); } catch (error) { next(error); } });
app.patch('/api/team-members/:id', async (req, res, next) => { try { send(res, await service.updateMember(id(req), req.body)); } catch (error) { next(error); } });
app.delete('/api/team-members/:id', async (req, res, next) => { try { send(res, await service.deleteMember(id(req), req.body.reassignTo, actor(req))); } catch (error) { next(error); } });
app.post('/api/team-members/:id/restore', async (req, res, next) => { try { send(res, await service.restoreMember(id(req)), 'Teammate restored'); } catch (error) { next(error); } });
app.get('/api/documents', async (req, res, next) => { try { send(res, await service.listDocuments(query(req))); } catch (error) { next(error); } });
app.post('/api/documents/upload-url', async (req, res, next) => { try { send(res, await service.createUpload(req.body, actor(req))); } catch (error) { next(error); } });
app.post('/api/documents/:id/complete', async (req, res, next) => { try { send(res, await service.completeUpload(id(req), actor(req))); } catch (error) { next(error); } });
app.post('/api/documents/:id/replace-url', async (req, res, next) => { try { send(res, await service.replaceUpload(id(req), req.body)); } catch (error) { next(error); } });
app.get('/api/documents/:id/download', async (req, res, next) => { try { send(res, await service.download(id(req), req.query.inline === '1' ? 'inline' : 'attachment', typeof req.query.versionId === 'string' ? req.query.versionId : undefined)); } catch (error) { next(error); } });
app.get('/api/documents/:id/versions', async (req, res, next) => { try { send(res, await service.versions(id(req))); } catch (error) { next(error); } });
app.post('/api/documents/:id/versions/:versionId/restore', async (req, res, next) => { try { send(res, await service.restoreVersion(id(req), String(req.params.versionId), actor(req))); } catch (error) { next(error); } });
app.patch('/api/documents/:id', async (req, res, next) => { try { send(res, await service.updateDocument(id(req), req.body)); } catch (error) { next(error); } });
app.delete('/api/documents/:id', async (req, res, next) => { try { send(res, await service.deleteDocument(id(req), actor(req))); } catch (error) { next(error); } });
app.post('/api/documents/:id/restore', async (req, res, next) => { try { send(res, await service.restoreDocument(id(req))); } catch (error) { next(error); } });
app.get('/api/templates', async (_req, res, next) => { try { send(res, await service.listTemplates()); } catch (error) { next(error); } });
app.post('/api/templates', async (req, res, next) => { try { send(res, await service.createTemplate(req.body, actor(req))); } catch (error) { next(error); } });
app.patch('/api/templates/:id', async (req, res, next) => { try { send(res, await service.updateTemplate(id(req), req.body)); } catch (error) { next(error); } });
app.delete('/api/templates/:id', async (req, res, next) => { try { send(res, await service.deleteTemplate(id(req))); } catch (error) { next(error); } });
app.post('/api/templates/:id/restore', async (req, res, next) => { try { send(res, await service.restoreTemplate(id(req)), 'Template restored'); } catch (error) { next(error); } });
app.get('/api/checklists', async (req, res, next) => { try { send(res, await service.listChecklists(typeof req.query.workItemId === 'string' ? req.query.workItemId : undefined)); } catch (error) { next(error); } });
app.post('/api/checklists', async (req, res, next) => { try { send(res, await service.createChecklist(req.body, actor(req))); } catch (error) { next(error); } });
app.patch('/api/checklists/:id', async (req, res, next) => { try { send(res, await service.updateChecklist(id(req), req.body)); } catch (error) { next(error); } });
app.get('/api/activities', async (req, res, next) => { try { send(res, await service.listActivities(query(req))); } catch (error) { next(error); } });
app.get('/api/notifications', async (_req, res, next) => { try { send(res, await service.listNotifications()); } catch (error) { next(error); } });
app.post('/api/notifications/read', async (req, res, next) => { try { send(res, await service.dismissNotification(req.body.dedupeKey, req.body.title, req.body.body, req.body.href)); } catch (error) { next(error); } });
app.get('/api/analytics', async (req, res, next) => { try { send(res, await service.analytics(query(req))); } catch (error) { next(error); } });
app.get('/api/search', async (req, res, next) => { try { send(res, await service.search(String(req.query.q ?? ''))); } catch (error) { next(error); } });
app.get('/api/export', async (_req, res, next) => { try { send(res, await service.exportWorkspace()); } catch (error) { next(error); } });
app.post('/api/import', async (req, res, next) => { try { send(res, await service.importWorkspace(req.body)); } catch (error) { next(error); } });
app.post('/api/demo/seed', async (req, res, next) => { try { send(res, await service.seedDemo(actor(req))); } catch (error) { next(error); } });
app.post('/api/demo/reset', async (_req, res, next) => { try { send(res, await service.resetDemo()); } catch (error) { next(error); } });
app.post('/api/workspace/clear', async (req, res, next) => { try { send(res, await service.clearWorkspace(req.body.confirm)); } catch (error) { next(error); } });
app.post('/api/maintenance/cleanup', async (_req, res, next) => { try { send(res, await service.maintenanceCleanup(), 'Maintenance cleanup completed'); } catch (error) { next(error); } });

app.put('/api/__mock_upload/:token', express.raw({ type: '*/*', limit: `${config.maxFileSizeMb}mb` }), async (req, res, next) => {
  try {
    if (!objects.consumeUpload) throw new ApiError(404, 'NOT_FOUND', 'Upload endpoint is unavailable in cloud mode.');
    await objects.consumeUpload(String(req.params.token), new Uint8Array(req.body as Buffer), req.header('content-type') ?? '');
    res.status(200).end();
  } catch (error) { next(error); }
});
app.get('/api/__mock_download/:token', async (req, res, next) => {
  try {
    if (!objects.readDownload) throw new ApiError(404, 'NOT_FOUND', 'Download endpoint is unavailable in cloud mode.');
    const file = await objects.readDownload(String(req.params.token));
    if (!file) throw new ApiError(404, 'NOT_FOUND', 'Download expired or file not found.');
    res.type(file.contentType).send(Buffer.from(file.bytes));
  } catch (error) { next(error); }
});

app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'API route not found.')));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const apiError = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  if (!(error instanceof ApiError)) console.error('[sky-vault-api]', error);
  res.status(apiError.status).json({ success: false, error: { code: apiError.code, message: apiError.message, ...(apiError.details ? { details: apiError.details } : {}) } });
});

export default app;

import { loadConfig } from '../src/server/config';
import { WorkspaceService } from '../src/server/service';
import { GcsObjectStorage } from '../src/server/storage/gcs';
import { PENDING_UPLOAD_PREFIX } from '../src/server/storage/memory';
import { FirestoreStore } from '../src/server/store/firestore';
import { createId } from '../src/shared/records';

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function report(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.info(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
}

async function check(name: string, run: () => Promise<string>) {
  try {
    report(name, true, await run());
  } catch (error) {
    report(name, false, error instanceof Error ? error.message : String(error));
  }
}

function assertSignedUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Signed URL is not HTTPS.');
  if (!parsed.searchParams.has('X-Goog-Signature')) throw new Error('Signed URL has no v4 signature.');
}

async function main() {
  const config = loadConfig();
  if (config.mode !== 'cloud' || config.problems.length) {
    report('Cloud Mode configuration', false, config.problems.join(' ') || 'APP_MODE is not cloud');
    return;
  }
  report('Cloud Mode configuration', true, `project=${config.projectId}`);
  const store = new FirestoreStore(config);
  const objects = new GcsObjectStorage(config);
  const service = new WorkspaceService(store, objects, config);
  await check('Bucket exists', async () => {
    if (!(await objects.bucketExists())) throw new Error(`Bucket ${config.bucket} is missing or inaccessible.`);
    return config.bucket;
  });
  await check('Firestore round-trip', async () => {
    const id = createId('smoke');
    const row = { id, note: 'smoke-check', createdAt: new Date().toISOString() };
    try {
      await store.save('smokeTests', row);
      const loaded = await store.get<{ id: string; note: string }>('smokeTests', id);
      if (!loaded || loaded.id !== id || loaded.note !== row.note) throw new Error('Read-back did not match the written record.');
      return `wrote and read ${id}`;
    } finally {
      await store.remove('smokeTests', id);
    }
  });
  const probePath = `${PENDING_UPLOAD_PREFIX}smoke/${createId('probe')}/probe.txt`;
  await check('Signed upload URL', async () => {
    assertSignedUrl(await objects.createUploadUrl(probePath, 'text/plain', config.uploadExpirySeconds));
    return 'v4 upload URL generated';
  });
  await check('Signed download URL', async () => {
    assertSignedUrl(await objects.createDownloadUrl(probePath, 'smoke.txt', 'attachment', config.downloadExpirySeconds));
    return 'v4 download URL generated';
  });
  await check('Maintenance cleanup', async () => {
    const result = await service.maintenanceCleanup();
    return `removedBackups=${result.backups.removed} markedFailed=${result.uploads.markedFailed} deletedPaths=${result.uploads.deletedPaths} expiredTokens=${result.uploads.expiredTokens}`;
  });
}

await main();
const failures = results.filter((result) => !result.ok);
if (failures.length) {
  console.error(`Cloud smoke test failed: ${failures.length} of ${results.length} checks failed.`);
  process.exitCode = 1;
} else {
  console.info(`Cloud smoke test passed: ${results.length} of ${results.length} checks passed.`);
}

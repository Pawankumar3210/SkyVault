import { loadConfig } from '../src/server/config';
import { WorkspaceService } from '../src/server/service';
import { FirestoreStore } from '../src/server/store/firestore';
import { GcsObjectStorage } from '../src/server/storage/gcs';

const config = loadConfig();
if (config.mode !== 'cloud' || config.problems.length) {
  throw new Error(`Cloud seed requires valid Cloud Mode configuration. ${config.problems.join(' ')}`);
}
const objects = new GcsObjectStorage(config);
if (!(await objects.bucketExists())) throw new Error(`Configured bucket ${config.bucket} does not exist or is not accessible.`);
const service = new WorkspaceService(new FirestoreStore(config), objects, config);
await service.seedDemo({ displayName: 'Sky Vault seed utility' });
console.info('Semester 5 sample records and demonstration documents were written to Firestore and Cloud Storage.');

import { Firestore, FieldValue, Timestamp } from '@google-cloud/firestore';
import type { AppConfig } from '../config';
import type { DataStore } from './memory';

const TIMESTAMP_FIELDS = new Set(['createdAt', 'updatedAt', 'deletedAt', 'archivedAt', 'completedAt', 'lastAccessedAt', 'readAt', 'expiresAt']);

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) output[key] = stripUndefined(entry);
    }
    return output;
  }
  return value;
}

function toTimestamp(value: unknown): Timestamp | null {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Timestamp.fromDate(date);
}

function revive(id: string, data: FirebaseFirestore.DocumentData): Record<string, unknown> {
  const output: Record<string, unknown> = { ...data, id };
  for (const field of TIMESTAMP_FIELDS) {
    const value = output[field];
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      output[field] = value.toDate().toISOString();
    }
  }
  return output;
}

export class FirestoreStore implements DataStore {
  private db: Firestore;

  constructor(config: AppConfig) {
    const credentials = JSON.parse(config.credentialsJson) as { client_email: string; private_key: string };
    this.db = new Firestore({
      projectId: config.projectId,
      credentials,
      preferRest: true,
      databaseId: '(default)',
    });
  }

  async list<T>(collection: string): Promise<T[]> {
    const snapshot = await this.db.collection(collection).limit(1000).get();
    return snapshot.docs.map((doc) => revive(doc.id, doc.data()) as T);
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const doc = await this.db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return revive(doc.id, doc.data() ?? {}) as T;
  }

  async save<T extends { id: string }>(collection: string, entity: T): Promise<T> {
    const entityWithTimestamps = entity as T & { createdAt?: string };
    const ref = this.db.collection(collection).doc(entity.id);
    const existing = await ref.get();
    const payload = stripUndefined({ ...entity }) as Record<string, unknown>;
    delete payload.id;
    payload.updatedAt = FieldValue.serverTimestamp();
    payload.createdAt = existing.exists ? toTimestamp(entityWithTimestamps.createdAt) ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp();
    for (const field of TIMESTAMP_FIELDS) {
      if (field === 'createdAt' || field === 'updatedAt') continue;
      if (payload[field] === null) continue;
      const converted = toTimestamp(payload[field]);
      if (converted) payload[field] = converted;
    }
    await ref.set(payload);
    const saved = await ref.get();
    return revive(saved.id, saved.data() ?? {}) as T;
  }

  async remove(collection: string, id: string): Promise<void> {
    await this.db.collection(collection).doc(id).delete();
  }
}

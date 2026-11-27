import { Storage } from '@google-cloud/storage';
import type { AppConfig } from '../config';
import { PENDING_UPLOAD_PREFIX, type CleanupOptions, type CleanupResult, type ObjectStorage } from './memory';

export class GcsObjectStorage implements ObjectStorage {
  kind = 'gcs' as const;
  private bucket;

  constructor(config: AppConfig) {
    const credentials = JSON.parse(config.credentialsJson) as { client_email: string; private_key: string };
    const storage = new Storage({ projectId: config.projectId, credentials });
    this.bucket = storage.bucket(config.bucket);
  }

  async createUploadUrl(path: string, contentType: string, expiresSeconds: number): Promise<string> {
    const [url] = await this.bucket.file(path).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresSeconds * 1000,
      contentType,
    });
    return url;
  }

  async createDownloadUrl(path: string, fileName: string, disposition: 'inline' | 'attachment', expiresSeconds: number): Promise<string> {
    const safe = fileName.replace(/["\r\n]/g, '');
    const [url] = await this.bucket.file(path).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresSeconds * 1000,
      responseDisposition: `${disposition}; filename="${safe}"`,
    });
    return url;
  }

  async readHead(path: string, length: number): Promise<Uint8Array | null> {
    try {
      const [buffer] = await this.bucket.file(path).download({ start: 0, end: Math.max(0, length - 1) });
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  async stat(path: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const [metadata] = await this.bucket.file(path).getMetadata();
      return { size: Number(metadata.size ?? 0), contentType: String(metadata.contentType ?? '') };
    } catch {
      return null;
    }
  }

  async save(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.bucket.file(path).save(Buffer.from(bytes), { contentType, resumable: false });
  }

  async delete(path: string): Promise<void> {
    await this.bucket.file(path).delete({ ignoreNotFound: true });
  }

  async bucketExists(): Promise<boolean> {
    const [exists] = await this.bucket.exists();
    return exists;
  }

  async cleanupExpiredUploads({ cutoff, preservePaths }: CleanupOptions): Promise<CleanupResult> {
    const [files] = await this.bucket.getFiles({ prefix: PENDING_UPLOAD_PREFIX });
    const deletedPaths: string[] = [];
    for (const file of files) {
      if (preservePaths.has(file.name)) continue;
      const timeCreated = file.metadata.timeCreated ? new Date(String(file.metadata.timeCreated)) : null;
      if (!timeCreated || Number.isNaN(timeCreated.getTime()) || timeCreated >= cutoff) continue;
      await file.delete({ ignoreNotFound: true });
      deletedPaths.push(file.name);
    }
    return { deletedPaths, expiredTokens: 0 };
  }
}

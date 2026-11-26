export interface StoredObject {
  path: string;
  bytes: Uint8Array;
  contentType: string;
}

export interface ObjectStorage {
  kind: 'memory' | 'gcs';
  createUploadUrl(path: string, contentType: string, expiresSeconds: number): Promise<string>;
  createDownloadUrl(path: string, fileName: string, disposition: 'inline' | 'attachment', expiresSeconds: number): Promise<string>;
  readHead(path: string, length: number): Promise<Uint8Array | null>;
  stat(path: string): Promise<{ size: number; contentType: string } | null>;
  save(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(path: string): Promise<void>;
  consumeUpload?(token: string, bytes: Uint8Array, contentType: string): Promise<void>;
  readDownload?(token: string): Promise<StoredObject | null>;
}

interface PendingUpload {
  path: string;
  contentType: string;
  expiresAt: number;
}

interface PendingDownload {
  path: string;
  fileName: string;
  disposition: 'inline' | 'attachment';
  expiresAt: number;
}

export class MemoryObjectStorage implements ObjectStorage {
  kind = 'memory' as const;
  private objects = new Map<string, StoredObject>();
  private uploads = new Map<string, PendingUpload>();
  private downloads = new Map<string, PendingDownload>();

  async createUploadUrl(path: string, contentType: string, expiresSeconds: number): Promise<string> {
    const token = crypto.randomUUID().replace(/-/g, '');
    this.uploads.set(token, { path, contentType, expiresAt: Date.now() + expiresSeconds * 1000 });
    return `/api/__mock_upload/${token}`;
  }

  async createDownloadUrl(path: string, fileName: string, disposition: 'inline' | 'attachment', expiresSeconds: number): Promise<string> {
    const token = crypto.randomUUID().replace(/-/g, '');
    this.downloads.set(token, { path, fileName, disposition, expiresAt: Date.now() + expiresSeconds * 1000 });
    return `/api/__mock_download/${token}`;
  }

  async consumeUpload(token: string, bytes: Uint8Array, contentType: string): Promise<void> {
    const pending = this.uploads.get(token);
    if (!pending || pending.expiresAt < Date.now()) throw new Error('Upload URL expired.');
    this.objects.set(pending.path, { path: pending.path, bytes, contentType: contentType || pending.contentType });
    this.uploads.delete(token);
  }

  async readDownload(token: string): Promise<StoredObject | null> {
    const pending = this.downloads.get(token);
    if (!pending || pending.expiresAt < Date.now()) return null;
    return this.objects.get(pending.path) ?? null;
  }

  async readHead(path: string, length: number): Promise<Uint8Array | null> {
    const object = this.objects.get(path);
    if (!object) return null;
    return object.bytes.subarray(0, length);
  }

  async stat(path: string): Promise<{ size: number; contentType: string } | null> {
    const object = this.objects.get(path);
    if (!object) return null;
    return { size: object.bytes.byteLength, contentType: object.contentType };
  }

  async save(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    this.objects.set(path, { path, bytes, contentType });
  }

  async delete(path: string): Promise<void> {
    this.objects.delete(path);
  }
}

import { ALLOWED_EXTENSIONS, MIME_BY_EXTENSION, type AllowedExtension } from './constants';

export interface FileInspection {
  ok: boolean;
  extension: AllowedExtension | null;
  mimeType: string;
  message: string;
}

const BLOCKED = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'sh', 'bash', 'ps1', 'js', 'mjs', 'cjs',
  'html', 'htm', 'svg', 'php', 'jar', 'dll', 'scr', 'apk', 'app',
]);

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

export function extensionOf(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? '';
  const match = /\.([a-zA-Z0-9]+)$/.exec(base);
  return match ? match[1].toLowerCase() : '';
}

export function sanitizeFileName(fileName: string): string {
  const base = (fileName.split(/[/\\]/).pop() ?? 'file').replace(/^\.+/, '');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(0, 120) || 'file';
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'general';
}

export function inspectFile(fileName: string, mimeType: string, bytes: Uint8Array, sizeBytes: number, maxBytes: number): FileInspection {
  if (!fileName.trim()) {
    return { ok: false, extension: null, mimeType, message: 'Choose a file before uploading.' };
  }
  if (sizeBytes <= 0) {
    return { ok: false, extension: null, mimeType, message: 'The selected file is empty.' };
  }
  if (sizeBytes > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, extension: null, mimeType, message: `Files must be ${maxMb} MB or smaller.` };
  }
  const extension = extensionOf(fileName);
  if (BLOCKED.has(extension)) {
    return { ok: false, extension: null, mimeType, message: 'This file type is blocked for safety.' };
  }
  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      ok: false,
      extension: null,
      mimeType,
      message: 'Use PDF, Office, CSV, TXT, PNG, JPG, or ZIP files.',
    };
  }
  const allowed = extension as AllowedExtension;
  const accepted = MIME_BY_EXTENSION[allowed];
  const normalizedMime = mimeType.trim().toLowerCase() || accepted[0];
  if (normalizedMime && !accepted.includes(normalizedMime) && normalizedMime !== 'application/octet-stream') {
    return { ok: false, extension: allowed, mimeType: normalizedMime, message: 'The file type does not match its extension.' };
  }
  if (!signatureMatches(allowed, bytes)) {
    return {
      ok: false,
      extension: allowed,
      mimeType: accepted[0],
      message: 'The file contents do not match the expected format.',
    };
  }
  return { ok: true, extension: allowed, mimeType: accepted[0], message: 'File accepted.' };
}

export function signatureMatches(extension: AllowedExtension, bytes: Uint8Array): boolean {
  if (extension === 'pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
  if (extension === 'png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  if (extension === 'jpg' || extension === 'jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === 'docx' || extension === 'pptx' || extension === 'xlsx' || extension === 'zip') {
    return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]);
  }
  if (extension === 'doc' || extension === 'ppt' || extension === 'xls') {
    return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0]);
  }
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  if (sample.includes(0)) return false;
  if (startsWith(sample, [0x4d, 0x5a]) || startsWith(sample, [0x7f, 0x45, 0x4c, 0x46])) return false;
  return true;
}

export function buildObjectPath(input: {
  subjectCode?: string | null;
  workItemId?: string | null;
  category: string;
  documentId: string;
  fileName: string;
}): string {
  const safeName = sanitizeFileName(input.fileName);
  const folder =
    input.category === 'template'
      ? 'templates'
      : input.category === 'report'
        ? 'reports'
        : input.category === 'presentation'
          ? 'presentations'
          : input.category === 'assignment'
            ? 'assignments'
            : input.category === 'laboratory'
              ? 'laboratory'
              : input.category === 'reference'
                ? 'reference'
                : 'reference';
  if (!input.subjectCode) {
    const area = input.category === 'reference' ? 'reference-materials' : 'shared-resources';
    return `general/${area}/${input.documentId}/${safeName}`;
  }
  const subject = slugify(input.subjectCode);
  if (input.category === 'template') {
    return `subjects/${subject}/templates/${input.documentId}/${safeName}`;
  }
  if (input.workItemId && (input.category === 'report' || input.category === 'presentation')) {
    return `subjects/${subject}/projects/${input.workItemId}/${folder}/${input.documentId}/${safeName}`;
  }
  if (input.workItemId) {
    return `subjects/${subject}/${folder}/${input.workItemId}/${input.documentId}/${safeName}`;
  }
  return `subjects/${subject}/${folder}/${input.documentId}/${safeName}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

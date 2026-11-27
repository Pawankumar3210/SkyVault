export interface AppConfig {
  mode: 'demo' | 'cloud';
  nodeEnv: string;
  port: number;
  projectId: string;
  bucket: string;
  region: string;
  credentialsJson: string;
  maxFileSizeMb: number;
  storageSoftLimitMb: number;
  uploadWarningPercentage: number;
  uploadExpirySeconds: number;
  downloadExpirySeconds: number;
  maxRetainedVersions: number;
  pendingUploadTtlSeconds: number;
  backupRetentionDays: number;
  corsOrigins: string[];
  problems: string[];
}

function numberFrom(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const mode = env.APP_MODE === 'cloud' ? 'cloud' : 'demo';
  const problems: string[] = [];
  const credentialsJson = env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ?? '';
  if (mode === 'cloud') {
    if (!env.GCP_PROJECT_ID?.trim()) problems.push('GCP_PROJECT_ID is missing.');
    if (!env.GCS_BUCKET_NAME?.trim()) problems.push('GCS_BUCKET_NAME is missing.');
    if (!credentialsJson) problems.push('GOOGLE_APPLICATION_CREDENTIALS_JSON is missing.');
    else {
      try {
        const parsed = JSON.parse(credentialsJson) as { client_email?: string; private_key?: string };
        if (!parsed.client_email || !parsed.private_key) {
          problems.push('Service account JSON must include client_email and private_key.');
        }
      } catch {
        problems.push('GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON.');
      }
    }
  }
  return {
    mode,
    nodeEnv: env.NODE_ENV ?? 'development',
    port: numberFrom(env.PORT, 8787),
    projectId: env.GCP_PROJECT_ID?.trim() ?? '',
    bucket: env.GCS_BUCKET_NAME?.trim() ?? '',
    region: env.GCP_REGION?.trim() || 'us-central1',
    credentialsJson,
    maxFileSizeMb: numberFrom(env.MAX_FILE_SIZE_MB, 10),
    storageSoftLimitMb: numberFrom(env.WORKSPACE_STORAGE_SOFT_LIMIT_MB, 500),
    uploadWarningPercentage: numberFrom(env.UPLOAD_WARNING_PERCENTAGE, 70),
    uploadExpirySeconds: numberFrom(env.UPLOAD_URL_EXPIRY_SECONDS, 300),
    downloadExpirySeconds: numberFrom(env.DOWNLOAD_URL_EXPIRY_SECONDS, 900),
    maxRetainedVersions: numberFrom(env.MAX_RETAINED_VERSIONS, 5),
    pendingUploadTtlSeconds: numberFrom(env.PENDING_UPLOAD_TTL_SECONDS, 3600),
    backupRetentionDays: numberFrom(env.BACKUP_RETENTION_DAYS, 7),
    corsOrigins: (env.CORS_ALLOWED_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    problems,
  };
}

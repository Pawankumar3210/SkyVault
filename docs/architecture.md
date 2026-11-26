# Sky Vault architecture

## System architecture

```mermaid
flowchart LR
  Browser[React + TypeScript + Vite]
  Static[Vercel static output: dist]
  Function[Express REST API on one Vercel Function]
  Firestore[(Firestore default database)]
  GCS[(Private Google Cloud Storage bucket)]
  IDB[(IndexedDB: Demo Mode records and file blobs)]
  Browser --> Static
  Browser -->|Cloud Mode REST| Function
  Browser -->|Demo Mode| IDB
  Function --> Firestore
  Function --> GCS
  Browser -->|short-lived signed upload/download URL| GCS
```

## Responsibilities

- **Vercel static output:** serves the Vite frontend and SPA fallback routes.
- **Express API:** validates requests with shared Zod schemas, enforces upload constraints and rate limits, applies business rules, and creates signed URLs. It exports an Express app from `api/index.ts`; Vercel runs it as a serverless Node.js function. There is no production `listen()` call.
- **Firestore:** stores subject, work, task, teammate, document metadata, template, checklist, activity, notification, and setting records. The Admin SDK is server-only. Firestore client rules deny direct client access.
- **Cloud Storage:** stores file bytes in a private bucket. Firestore stores object paths and metadata only.
- **IndexedDB:** provides persistent browser-local records and files in Demo Mode. Demo files are never represented as GCS objects.

## Data flow

```mermaid
sequenceDiagram
  participant UI as Browser UI
  participant API as Express API
  participant DB as Firestore
  UI->>API: REST request + form data
  API->>API: Zod validation and business rules
  API->>DB: Read/write structured records
  DB-->>API: Saved record
  API-->>UI: { success, data, message }
```

## File upload and download flow

```mermaid
sequenceDiagram
  participant UI as Browser
  participant API as Express API
  participant GCS as Private GCS bucket
  participant DB as Firestore
  UI->>API: filename, MIME, size, signature
  API->>API: Validate allowed file type and size
  API->>DB: Save pending document metadata
  API-->>UI: Short-lived signed PUT URL
  UI->>GCS: Upload bytes directly
  UI->>API: Complete upload
  API->>GCS: Verify object size and signature
  API->>DB: Mark metadata ready; retain previous version
  API-->>UI: Ready document
  UI->>API: Request document download
  API->>DB: Confirm metadata exists
  API-->>UI: Short-lived signed GET URL
  UI->>GCS: Download file bytes
```

## Project management workflow

```mermaid
stateDiagram-v2
  [*] --> NotStarted
  NotStarted --> InProgress: Begin work
  InProgress --> UnderReview: Request review
  UnderReview --> InProgress: Revise
  UnderReview --> Submitted: Submit
  InProgress --> Completed: Mark complete
  Submitted --> InProgress: Reopen
  Completed --> InProgress: Reopen
  InProgress --> Archived: Archive or soft delete
  Archived --> InProgress: Restore
```

## Firestore relationships

```mermaid
erDiagram
  SUBJECTS ||--o{ WORK_ITEMS : contains
  WORK_ITEMS ||--o{ TASKS : decomposes_into
  TEAM_MEMBERS ||--o{ TASKS : assigned_to
  TEAM_MEMBERS }o--o{ WORK_ITEMS : responsible_for
  SUBJECTS ||--o{ DOCUMENTS : categorizes
  WORK_ITEMS ||--o{ DOCUMENTS : references
  DOCUMENTS ||--o{ DOCUMENT_VERSIONS : versions
  TEMPLATES ||--o{ CHECKLISTS : supplies
  WORK_ITEMS ||--o{ CHECKLISTS : checks
  SUBJECTS ||--o{ ACTIVITIES : scopes
  SETTINGS ||--|| WORKSPACE : configures
```

## API and routing

The API uses `/api/health`, `/api/workspace`, `/api/subjects`, `/api/work-items`, `/api/tasks`, `/api/team-members`, `/api/documents`, `/api/templates`, `/api/checklists`, `/api/activities`, `/api/notifications`, `/api/analytics`, `/api/search`, and `/api/export`/`import`. All success responses use `{ success: true, data, message }`; failures use `{ success: false, error: { code, message } }`.

`vercel.json` rewrites API subpaths through `/api/index` and passes the requested route query for Express route normalization. All other paths rewrite to the Vite `index.html`; Vercel serves the static `dist` output independently of Express.

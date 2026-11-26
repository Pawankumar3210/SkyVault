# Sky Vault

**Your Academic Universe, Organized.**

Sky Vault is a shared Semester 5 academic workspace for subjects, projects, assignments, labs, team responsibilities, deadlines, templates, and documents. It opens directly into the workspace; there is no login or account system.

## Features

- Semester command center with computed workload, deadlines, progress, and activity.
- Editable subjects, projects, assignments, laboratory work, teammates, tasks, and reusable templates.
- Project list, status board, timeline, and calendar views.
- Submission checklists, activity history, analytics, archive, searchable records, deadline notices, and JSON export/import.
- Document preview where supported, replacement, version history and restore, trash recovery, and Cloud Mode upload progress.
- Browser-persistent Demo Mode using IndexedDB, including local demonstration files.
- Cloud Mode REST API backed by Firestore and private Google Cloud Storage, with server-generated signed upload/download URLs and file versions.
- Responsive layout, dark/light theme, and no authentication barrier.

## Stack and architecture

React, TypeScript, Vite, Tailwind CSS, React Router, TanStack-compatible service boundary, React Hook Form-ready schemas, Zod, Express, Firestore Admin SDK, Google Cloud Storage, Recharts, Lucide, and Vercel Functions. See [architecture](docs/architecture.md) and [database schema](docs/database-schema.md).

The frontend is the Vite static build (`dist`). `api/index.ts` exports an Express app for Vercel's Node.js function runtime. Local development uses Vite on port 5173 and the Express API on 8787. The browser never receives Firestore Admin or GCS service credentials.

## Local installation

Requirements: Node.js 22 or newer and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:5173>. Demo Mode is the default and does not need Google Cloud credentials. Demo records and file blobs stay in the browser that created them. Clearing browser site data removes that local demo workspace.

## Environment variables

See [.env.example](.env.example). `VITE_APP_MODE` selects the frontend adapter at build time. `APP_MODE` selects the backend mode. Use `demo` for local IndexedDB storage, or set both to `cloud` and configure the server-side Google Cloud settings. Never add credentials to a `VITE_` variable or commit a populated `.env` file.

Cloud Mode with missing or invalid settings returns an explicit configuration error. It does not fall back to temporary in-memory storage.

## Google Cloud setup

Follow [docs/cloud-setup.md](docs/cloud-setup.md) to enable the default Firestore database, create a private `us-central1` bucket, set uniform bucket-level access and public access prevention, configure bucket CORS, and create a least-privilege service account. Then set `APP_MODE=cloud`, `VITE_APP_MODE=cloud`, `GCP_PROJECT_ID`, `GCS_BUCKET_NAME`, and `GOOGLE_APPLICATION_CREDENTIALS_JSON` in server-only environments.

Cloud behavior is implemented, but it has **not** been verified against a real GCP project in this checkout because no project credentials or bucket were supplied. The app labels Demo Mode honestly until configured.

## Vercel deployment

See [docs/deployment.md](docs/deployment.md). Import the repository into Vercel, use `npm run build` and `dist`, add server-only Google Cloud settings for Cloud Mode, and set `VITE_APP_MODE` before the production build. Deployment requires the project owner's Vercel account and explicit production approval; no deploy or Git push is performed here.

The `/api/*` rewrite routes to one Express Vercel Function. Vercel's current Express integration treats the app as a serverless function and does not serve static files through `express.static`; the Vite build is served separately from `dist`. [Vercel Express documentation](https://vercel.com/docs/frameworks/backend/express).

## Testing

```bash
npm run typecheck
npm run build
npm test
npm run test:e2e
```

Unit and API integration tests use local/mocked services. The Playwright suite exercises a browser workflow in Demo Mode. Cloud integration tests must only be described as passed after actual GCP operations have been executed with credentials.

## Screenshots

Add exhibition screenshots here after running the local application at desktop and mobile sizes.

## Security and limitations

This is intentionally a public shared workspace with no login. Anyone with the deployed URL may read and change shared records. Selected teammate names are self-reported actor labels, not verified identities. Do not store sensitive personal information. API request validation, size/type checks, request limits, soft deletion, and confirmation gates reduce accidental or abusive changes but do not replace identity-based access control. In-memory API rate limits are best-effort across serverless instances.

Demo Mode data is browser-local rather than shared. Cloud Mode shares structured records through Firestore and actual file bytes through a private GCS bucket. Workspace storage limits are soft application limits, not a cost guarantee. Monitor Google Cloud usage and billing; no paid service is activated automatically. Structured exports omit file bytes and credentials.

Additional operational notes: [Security model](docs/security.md), [Cloud setup](docs/cloud-setup.md), and [deployment](docs/deployment.md).

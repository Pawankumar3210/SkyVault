# Deployment guide

## GitHub preparation

1. Review `git status`; commit source, lockfile, rules, indexes, docs, and tests.
2. Confirm `.env`, service-account JSON, and local data are not tracked. `.gitignore` excludes local environment files.
3. Push to the intended GitHub repository only after owner approval. No remote push is performed as part of this implementation.

## Vercel project

1. Import the repository in Vercel.
2. Set the root directory to the repository root.
3. Use build command `npm run build` and output directory `dist`. Node.js 22 is recommended.
4. The project uses `vercel.json`: `/api/*` routes to the Express Vercel Function, and non-API routes fall back to the Vite `index.html` for React Router. Express does not serve frontend build files.
5. For a demo deployment, build with `VITE_APP_MODE=demo` and set `APP_MODE=demo`. Data is browser-local and not shared between visitors.
6. For a cloud deployment, build with `VITE_APP_MODE=cloud`; set `APP_MODE=cloud`, `GCP_PROJECT_ID`, `GCS_BUCKET_NAME`, `GCP_REGION`, and `GOOGLE_APPLICATION_CREDENTIALS_JSON` as server-side environment variables. Add `CORS_ALLOWED_ORIGIN` only for trusted origins. Never prefix secrets with `VITE_`.
7. Configure GCS bucket CORS for the deployed origin and validate the bucket is private before launch.

## Verification after deployment

- Check the `/api/health` response and Vercel function logs.
- Visit dashboard, a nested project route, and refresh each route to confirm SPA fallback.
- In Cloud Mode, create a record, reload it from Firestore, upload/download/replace a document, and inspect version history.
- In Demo Mode, verify IndexedDB persistence and confirm the UI explicitly identifies browser-local storage.
- Test mobile layout, export, imports with a throwaway backup, and all main navigation links.
- Inspect Vercel and GCP logs for server errors. Verify that no credentials or signed URLs appear in browser bundles or logs.

## Troubleshooting

- **Cloud configuration error:** compare server env names with `.env.example`; parse the JSON key and restart/redeploy.
- **Signed upload blocked:** configure bucket CORS for the exact origin and `PUT`/`Content-Type`; verify URL expiry and service-account permissions.
- **Firestore permission/API errors:** check API enablement, default database creation, Firestore IAM, and configured project ID.
- **SPA 404 on refresh:** preserve the non-API `index.html` rewrite in `vercel.json`.
- **API route returns not found:** inspect `/api/*` rewrite and `route` query normalization.
- **Import omits files in Cloud Mode:** structured backups contain metadata only. Reupload the document bytes after importing; Cloud Mode intentionally discards imported object paths so backups cannot create signed access to arbitrary bucket objects.
- **Large bundle/function:** inspect build chunks and Vercel function bundle limits. Do not move frontend static output into Express.

Production deployment and remote pushes require account credentials and explicit approval. Vercel's documented Express integration packages Express as a serverless function; static output is served separately. See [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

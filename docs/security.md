# Security model and limitations

## Shared access

There is intentionally no login or authentication. Anyone who can access the deployed URL can read and change shared Semester 5 workspace data. The selected teammate name is only a reported actor label. `identityVerified` remains false. Do not use this app for passwords, private contact data, grades, health data, or other sensitive personal information.

## Controls in the implementation

- Firestore client rules deny direct unauthenticated access. The Firestore Admin SDK is initialized only in the Express server.
- GCS objects are private and accessed with short-lived signed URLs. Clients do not submit arbitrary object paths for download; the service resolves paths from existing document metadata.
- Upload metadata is validated server-side for allowed extension, MIME type, content signature, and maximum size. The browser uploads directly to GCS after receiving a short-lived signed URL, then the API verifies the stored object before marking metadata ready.
- Replaced files use version records and configured retention. A failed metadata commit attempts to delete the new object and preserve the prior one.
- Soft-deleted documents are excluded from signed-download and version APIs. Cloud imports discard file metadata because JSON backups do not contain bytes; this prevents client-supplied object paths from being converted into signed URLs.
- API JSON bodies are limited to 1 MB. The API applies Zod validation, Helmet headers, conservative request limiting, and safe generic production error responses.
- Cloud configuration errors are explicit and do not switch to a temporary memory store. Demo Mode is clearly labeled and uses IndexedDB.
- Routine delete actions use soft deletion where supported and user confirmation. Import requires an explicit confirmation string.

## Limits

The Express rate limiter is process-memory based and is only best-effort when serverless functions scale across instances. Because identities are not verified, there is no per-person authorization, contribution proof, or reliable attribution. The public workspace is not suitable for confidential data. Cloud bucket CORS, IAM scope, public-access prevention, billing controls, and Firestore location must be configured by the project owner and reviewed in Google Cloud. Signed URLs are bearer links until expiration; avoid forwarding them.

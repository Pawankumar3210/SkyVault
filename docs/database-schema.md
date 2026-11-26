# Firestore data schema

All data lives in the default Firestore database. IDs are also document IDs. ISO date strings are accepted by the service and persisted as Firestore timestamps for known timestamp fields. There are no large embedded file contents.

| Collection | Record | Main fields |
|---|---|---|
| `subjects` | Subject | `id`, `name`, `code`, `description`, `color`, archive/delete flags, timestamps |
| `workItems` | Project, assignment, lab | `id`, `type`, `subjectId`, status, priority, due date, progress, team IDs, milestones, soft-delete fields |
| `tasks` | Assigned task | `id`, `workItemId`, `assignedMemberId`, status, priority, due date, completion timestamp |
| `teamMembers` | Teammate | `id`, name, contact fields, academic role, skills, soft-delete fields |
| `documents` | File metadata | `id`, display/original name, `storageObjectPath`, storage mode, category, MIME type, byte size, version, parent IDs, state, timestamps |
| `documentVersions` | Prior file version | `id`, `documentId`, object path, version, byte size, MIME type, original name, timestamp |
| `templates` | Reusable template metadata | `id`, subject, category, document ID, source, instructions, checklist items |
| `checklists` | Submission checklist | `id`, `workItemId` or `templateId`, title, item labels, completion flags |
| `activities` | Workspace history | `id`, event type, description, selected actor label, `identityVerified: false`, entity references, timestamp |
| `notifications` | Workspace notice | `id`, title, body, severity, link, deduplication key, read timestamp |
| `settings` | Workspace configuration | `id: "workspace"`, semester, timezone, size/retention limits, status/category lists |

Example `workItems/{workId}`:

```json
{
  "id": "work_example",
  "title": "Private document vault",
  "type": "project",
  "subjectId": "sub_cct",
  "status": "in_progress",
  "priority": "high",
  "dueDate": "2026-12-12",
  "teamMemberIds": ["mem_example"],
  "progress": 40,
  "isDeleted": false,
  "createdAt": "2026-11-20T10:00:00.000Z",
  "updatedAt": "2026-11-24T10:00:00.000Z"
}
```

Example `documents/{documentId}`:

```json
{
  "id": "doc_example",
  "displayName": "Project report",
  "originalName": "report.pdf",
  "storageObjectPath": "subjects/cct/projects/work_example/reports/doc_example/report.pdf",
  "storageMode": "gcs",
  "category": "report",
  "mimeType": "application/pdf",
  "sizeBytes": 245120,
  "version": 2,
  "status": "ready",
  "isDeleted": false
}
```

Indexes are checked into `firestore.indexes.json`. The current repository service paginates API list results and caps the simple Firestore collection scan at 1,000 documents. For larger deployments, replace the full snapshot/list scan with query-specific indexed repository methods and cursor pagination before the data approaches that cap.

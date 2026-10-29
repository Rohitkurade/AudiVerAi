# Draft API Contract

This is a proposed contract for future NestJS implementation, not a description of endpoints implemented by the current Express API. The prototype screens use fictional browser-local data only. Prefix future endpoints with `/api/v1`; protect them with authentication and authorization before connecting the frontend.

## Conventions

- JSON request and response bodies use camelCase.
- Resource IDs are opaque strings. Timestamps are ISO 8601 UTC strings.
- List responses use `{ "items": [], "total": 0, "page": 1, "pageSize": 25 }`.
- Errors use `{ "statusCode": 400, "code": "VALIDATION_FAILED", "message": "Request validation failed", "details": [] }`. Do not expose secrets or internal stack traces.
- Validate query and body inputs at the API boundary. Enforce tenant and resource-level authorization server-side.

## Audits

### `GET /api/v1/audits`

Query: optional `search`, `status`, `page`, `pageSize`.

Response item:

```json
{
  "id": "aud_opaque_id",
  "name": "Q4 Financial Controls",
  "client": "Northstar Health Group",
  "type": "Financial",
  "period": "2025-Q4",
  "ownerId": "user_opaque_id",
  "status": "in_progress",
  "progress": 68,
  "updatedAt": "2025-12-01T10:42:00Z"
}
```

### `POST /api/v1/audits`

Request: `{ "name": "Q1 Access Controls", "client": "Example Co", "type": "ITGC", "period": "2026-Q1", "ownerId": "user_opaque_id" }`.

Response: `201 Created` with the created audit resource. The server assigns the ID, initial `planning` status, timestamps, and authorization scope.

### `GET /api/v1/audits/{auditId}`

Response: one audit resource, with optional links/counts for findings and evidence metadata.

### `PATCH /api/v1/audits/{auditId}`

Request: `{ "status": "under_review" }` or another explicitly permitted field update. Validate status transitions and write an audit log.

## Evidence metadata

### `GET /api/v1/audits/{auditId}/evidence`

Query: optional `search`, `page`, `pageSize`.

Response item: `{ "id": "evi_opaque_id", "filename": "ledger.xlsx", "mediaType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "sizeBytes": 1234, "uploadedAt": "2025-12-01T10:42:00Z", "findingIds": [] }`.

### `POST /api/v1/audits/{auditId}/evidence`

Future upload flow only: authenticated upload authorization followed by server-validated metadata creation. Define private object storage, malware scanning, size/type limits, encryption, retention, and access logging before implementing. The current prototype has no upload route or file storage.

## Findings

### `GET /api/v1/audits/{auditId}/findings`

Query: optional `severity`, `status`, `search`, `page`, `pageSize`.

Response item: `{ "id": "fnd_opaque_id", "title": "Unreconciled journal entries", "severity": "high", "status": "open", "description": "...", "evidenceIds": [], "createdAt": "2025-12-01T10:42:00Z", "updatedAt": "2025-12-01T10:42:00Z" }`.

### `PATCH /api/v1/findings/{findingId}`

Request: `{ "status": "in_review" }` and/or authorized finding edits. Return the updated resource and record the actor/change.

## AI gateway (future, simulated in this prototype)

### `POST /api/v1/audits/{auditId}/copilot/suggestions`

Request: `{ "evidenceIds": ["evi_opaque_id"], "task": "review_control_evidence" }`.

Response: `{ "id": "sug_opaque_id", "status": "ready_for_review", "provider": "configured-provider", "model": "configured-model", "summary": "...", "evidenceReferences": [{ "evidenceId": "evi_opaque_id", "locator": "optional-source-location" }], "generatedAt": "2025-12-01T10:42:00Z" }`.

The backend must authorize all referenced evidence, minimize provider input, record provenance, and clearly label unverified model output. A suggestion must never automatically become a finding or audit conclusion.

### `POST /api/v1/copilot/suggestions/{suggestionId}/decision`

Request: `{ "decision": "accepted" }` or `{ "decision": "rejected" }`, with an optional reviewer note. Acceptance creates or links a draft finding only after explicit reviewer action; it does not assert that the suggestion is factually correct.

## Health

- `GET /health` — process liveness.
- `GET /health/ready` — service readiness, including required dependency checks without returning credentials.

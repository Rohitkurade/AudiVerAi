# NestJS Migration Plan

## Goal and constraints

The target backend is Node.js 24 LTS, NestJS, and MySQL 8.4. The current Express server remains the supported API until a replacement is implemented, tested, and ready for an explicit cutover. Do not run two competing production APIs or point the prototype at production-like records.

Angular 22 is the target frontend. The environment used for this prototype is Node.js 22.22.0 with Angular 21.2.25. Registry metadata for Angular 22 declares Node `^22.22.3 || ^24.15.0 || >=26.0.0`, so the installed runtime is below the supported range. Upgrade the development runtime to Node 24.15+ (or a compatible later 24 LTS release), then perform the Angular upgrade with a reviewed lockfile change and build/test verification.

## Migration stages

1. **Baseline and contracts**
   - Inventory the current Express routes and configuration, the existing `audits` schema, and consumers.
   - Agree on identifiers, status values, ownership, retention, authorization, and error formats.
   - Keep the current database and Docker volume intact; prepare additive, reversible schema migrations only after review.
2. **NestJS foundation**
   - Create a separately reviewed NestJS application when the team approves the migration.
   - Add configuration validation, health/readiness endpoints, request validation, structured logging, and database connection management.
   - Retain Express until equivalent API behavior and operational checks pass.

   The initial foundation is implemented under `backend/src/nest` and runs independently from Express on port 3001 by default. It currently provides liveness and MySQL readiness checks; domain APIs and production cutover remain future work.
3. **Domain APIs**
   - Implement audit, finding, and evidence-metadata modules using the draft [API contract](./api-contract.md).
   - Add integration tests against an isolated MySQL 8.4 test database and API contract tests.
   - Do not mix sample browser state with database fixtures or production records.
4. **Provider-neutral AI gateway**
   - Add a backend-only gateway interface and provider adapters behind explicit configuration.
   - Enforce authorization, data minimization, audit logging, timeouts, and human review. Keep credentials server-side.
   - Return provider/model and evidence-reference metadata; do not treat model output or a citation as verified audit evidence.
5. **Frontend integration and cutover**
   - Add typed Angular API services and an environment-specific API base URL.
   - Verify migrations, authorization, error handling, and end-to-end flows in a non-production environment.
   - Cut over only after parity and rollback plans are accepted; then remove Express in a separate approved change.
6. **Deployment**
   - Define AWS hosting, secrets management, database/network boundaries, observability, backups, and release automation after security and operations review.

## Acceptance gates

- Angular 22 build and tests pass on a supported Node runtime.
- NestJS API contract and migration tests pass against a disposable MySQL 8.4 test database.
- Existing Express behavior is preserved until the replacement passes agreed parity checks.
- No production credentials, uploaded audit evidence, or AI provider secrets are placed in the browser bundle.
- The prototype remains browser-local until an explicit API integration change is approved.

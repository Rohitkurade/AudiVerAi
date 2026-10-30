# AudiVerAI

AudiVerAI is an audit automation and assurance platform prototype. The repository keeps the Angular frontend, the existing Express API, MySQL files, and local Docker Compose setup together.

## What works in this prototype

The Angular application provides a session-protected workspace with five demo screens:

- **Dashboard** — audit and finding metrics, progress, activity, and quick actions.
- **Audits** — search/filter sample engagements, view details, create validated demo audits, and change status.
- **Evidence** — searchable sample file records linked to audits and findings.
- **Findings** — filter by severity/status, inspect evidence references, and demonstrate status changes.
- **AI Copilot** — review, accept, or reject prewritten simulated suggestions linked to sample evidence.

All records are fictional. Demo edits are isolated in browser `localStorage` under `audiverai-demo-state-v1`; they do not call the API or modify MySQL. The evidence screen does not upload or securely store files. **AI Copilot responses are simulated static text** and its sample references are not verified citations or AI-provider output. Do not enter real audit or personal data.

The frontend is currently Angular 21. The architecture target remains Angular 22 and Node.js 24 LTS; dependency upgrades are deferred until the runtime and package compatibility gate described in [the migration plan](./docs/nestjs-migration-plan.md) is met. The existing Express backend is intentionally preserved while the prototype is developed.

## Prerequisites

- Node.js 22.12 or later in the Node 22 line for the current Angular 21 frontend (the checked-in lockfile was verified with Node.js 22.22.0 and npm 10.9.4).
- npm.
- Optional: Docker Desktop with Docker Compose, and MySQL 8.4 for backend/database development.

## Run the frontend prototype

From the repository root, in PowerShell:

```powershell
cd frontend
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200). The frontend build does not require MySQL, but signing in and restoring a session require the NestJS authentication API and the MySQL database.

To create a production build:

```powershell
cd frontend
npm run build
```

## Optional local database and existing API

MySQL is not required for the frontend demo. To run the existing Express API against the local MySQL service, first review `.env.example`, copy it to `.env`, and replace the example passwords with local-only values:

```powershell
Copy-Item .env.example .env
docker compose up -d database
```

Do not delete the Docker volume or recreate the database as part of prototype setup. In another terminal:

```powershell
cd backend
npm ci
npm run dev
```

The existing Express API is available at `http://localhost:3000`; health checks are `/health` and `/health/db`. The Angular demo does not use Express or database-backed audit records.

The NestJS backend is being introduced alongside Express so the existing API remains available during migration. From `backend`, run `npm ci`, then `npm run dev:nest`; NestJS listens on `http://localhost:3001` by default, with liveness at `/health` and database readiness at `/health/ready`. Set `NEST_PORT` to change its port. The NestJS service uses the same database environment variables as Express. Do not switch clients or deployments to NestJS until the API contract and migration checks are complete.

The NestJS API includes session-based authentication at `/api/auth`. Before starting it, set `AUTH_CSRF_SECRET` in the root `.env` to a randomly generated value of at least 32 bytes and optionally set `AUTH_SESSION_TTL_HOURS` (1-720; default 12). Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Configure `CORS_ORIGIN` to the exact Angular origin. In production, set `NODE_ENV=production` and serve the API over HTTPS so the session and CSRF cookies are Secure.

From `backend`, run `npm run dev:nest` for development or `npm run build; npm run start:nest` to build and start NestJS. Provision the first administrator interactively with `npm run auth:provision-admin`; password input is hidden, passwords are hashed with Argon2id, and provisioning refuses to create another ADMIN account.

Call `GET /api/auth/csrf` first; it returns `{ "csrfToken": "..." }` and sets the CSRF cookie. Send that cookie and its token in `X-CSRF-Token` with unsafe requests. For example, `POST /api/auth/login` takes `{ "email": "admin@example.com", "password": "..." }` and returns `{ "user": { "id": "1", "fullName": "...", "email": "...", "status": "ACTIVE", "department": null, "roles": ["ADMIN"], "permissions": ["..."] } }`; the session token is only set in an HttpOnly cookie. `GET /api/auth/me` returns the authenticated profile, roles, and permissions. `POST /api/auth/logout` revokes the session and clears cookies (204 response). Login failures use a generic 401; missing authentication is 401 and missing permissions are 403.

Protect future permission-gated NestJS handlers with `@UseGuards(AuthGuard, PermissionsGuard)` and `@RequirePermissions('audits.review')`. Login throttling currently uses the Nest in-memory store (5 attempts per minute per IP); use a shared store before deploying multiple API instances.

## Run the authenticated Angular workspace

The Angular frontend uses the NestJS session API, not the existing Express API. Confirm MySQL is running, the authentication migration has been applied, and an administrator has been provisioned before attempting a successful login. Set `CORS_ORIGIN` in the root `.env` to the exact frontend origin (default `http://localhost:4200`).

Start NestJS from one PowerShell terminal:

```powershell
cd backend
npm run dev:nest
```

Start Angular from another:

```powershell
cd frontend
npm start
```

The development API URL is configured in `frontend/src/environments/environment.ts` (default `http://localhost:3001`). Production builds use a relative API URL, so deploy the frontend and NestJS API behind the same origin or set the production environment URL to the API origin and configure CORS accordingly. Run the frontend auth and route tests with `npm test` from `frontend`.

The Angular app restores `/api/auth/me` at startup, uses the `audiverai_session` HttpOnly cookie and signed CSRF token flow, and does not persist credentials or session tokens in browser storage. There is no remember-me option because the backend session lifetime is configured server-side. Audit, evidence, finding, and Copilot records remain browser-only demo data; frontend permission checks only control presentation and are not an authorization boundary.

## Local demo data

Create, status, finding, and Copilot review actions update the browser-only demo workspace. Data persists across reloads in the same browser profile. To restore the original sample records, remove the `audiverai-demo-state-v1` entry from this site’s local storage in browser developer tools. This does not affect MySQL.

## Architecture and next steps

- [Architecture overview](./docs/architecture.md)
- [NestJS migration plan](./docs/nestjs-migration-plan.md)
- [Draft API contract](./docs/api-contract.md)
- [Deployment notes](./docs/deployment.md)

The next integration work is to agree the audit/evidence/finding schema against the existing MySQL `audits` table, implement and test those APIs in NestJS before retiring Express, connect the frontend demo features through typed API services, and design authenticated evidence storage and a provider-neutral AI gateway. AWS deployment remains a future target.

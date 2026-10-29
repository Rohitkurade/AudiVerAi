# AudiVerAI

AudiVerAI is an audit automation and assurance platform prototype. The repository keeps the Angular frontend, the existing Express API, MySQL files, and local Docker Compose setup together.

## What works in this prototype

The Angular application provides five navigable screens:

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

Open [http://localhost:4200](http://localhost:4200). The frontend prototype runs without MySQL or the API.

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

The existing API is available at `http://localhost:3000`; health checks are `/health` and `/health/db`. The Angular demo currently does not call either endpoint or use database records.

## Local demo data

Create, status, finding, and Copilot review actions update the browser-only demo workspace. Data persists across reloads in the same browser profile. To restore the original sample records, remove the `audiverai-demo-state-v1` entry from this site’s local storage in browser developer tools. This does not affect MySQL.

## Architecture and next steps

- [Architecture overview](./docs/architecture.md)
- [NestJS migration plan](./docs/nestjs-migration-plan.md)
- [Draft API contract](./docs/api-contract.md)
- [Deployment notes](./docs/deployment.md)

The next integration work is to agree the audit/evidence/finding schema against the existing MySQL `audits` table, implement and test the versioned API in NestJS before retiring Express, connect the frontend through typed API services, and design authenticated evidence storage and a provider-neutral AI gateway. AWS deployment remains a future target.

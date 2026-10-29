# Architecture

AudiVerAI is organized as a monorepo with an Angular frontend in `frontend`, an API in `backend`, and MySQL migrations in `database/migrations`.

Feature-specific frontend code belongs under `frontend/src/app/features`. Shared frontend services and API configuration belong under `frontend/src/app/core`. The API connects to MySQL using the `DB_*` environment variables.

## Approved target

- Angular 22 and TypeScript frontend.
- Node.js 24 LTS and NestJS API.
- MySQL 8.4 with Docker Compose for local development.
- Provider-neutral AI gateway behind the backend; never expose AI credentials in the Angular bundle.
- AWS is a future deployment target, not an implemented environment.

## Current prototype boundary

The current frontend prototype remains on Angular 21 until its runtime compatibility gate is met. Its audit, evidence, finding, and Copilot demo records are fictional and stored in browser local storage. It does not call the existing Express API or read/write MySQL.

The Express backend and existing database are preserved. Do not start a parallel NestJS API for this demo. The [NestJS migration plan](./nestjs-migration-plan.md) and [draft API contract](./api-contract.md) describe the future migration, testing, and cutover sequence.

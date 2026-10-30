import 'reflect-metadata';

import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { hashPassword, verifyPassword } from '../dist/nest/modules/auth/password';
import { AuthModule } from '../dist/nest/modules/auth/auth.module';
import { DatabaseService } from '../dist/nest/database.service';
import { PermissionsGuard } from '../dist/nest/modules/auth/guards/permissions.guard';
import { AdminProvisioningService } from '../dist/nest/modules/auth/provisioning';
import type { AdminCredentials } from '../dist/nest/modules/auth/provisioning';
import supertest from 'supertest';
import {
  afterEach,
  beforeEach,
  test,
} from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'mysql2/promise';

const origin = 'http://localhost:4200';
process.env.CORS_ORIGIN = origin;
process.env.AUTH_CSRF_SECRET = 'test-only-csrf-secret-with-at-least-32-bytes';

interface FakeSession {
  tokenHash: string;
  revoked: boolean;
  expired: boolean;
}

class FakeDatabase {
  account = {
    id: '17',
    full_name: 'Rohit Kurade',
    email: 'rohit@example.com',
    password_hash: '',
    status: 'ACTIVE',
    department: 'Internal Audit',
  };
  sessions = new Map<string, FakeSession>();
  lastAdminPasswordHash: string | undefined;
  hasAdmin = false;
  releasedConnections = 0;
  committed = false;
  rolledBack = false;

  readonly pool = {
    execute: async (sql: string, values: unknown[] = []): Promise<[unknown, unknown]> => {
      if (sql.includes('FROM users AS u')) {
        const email = values[0];
        if (email !== this.account.email) {
          return [[], []];
        }
        return [this.credentialRows(), []];
      }

      if (sql.includes('INSERT INTO sessions')) {
        const tokenHash = String(values[1]);
        this.sessions.set(tokenHash, { tokenHash, revoked: false, expired: false });
        return [{ insertId: 31 }, []];
      }

      if (sql.includes('SELECT UNIX_TIMESTAMP(expires_at')) {
        return [[{
          expires_at_epoch: Math.floor((Date.now() + 12 * 60 * 60 * 1000) / 1000),
        }], []];
      }

      if (sql.includes('FROM sessions AS s')) {
        const tokenHash = String(values[0]);
        const session = this.sessions.get(tokenHash);
        if (
          !session
          || session.revoked
          || session.expired
          || this.account.status !== 'ACTIVE'
        ) {
          return [[], []];
        }
        return [this.sessionRows(), []];
      }

      if (sql.includes('UPDATE sessions') && sql.includes('last_activity_at')) {
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes('UPDATE sessions') && sql.includes('revoked_at')) {
        const tokenHash = String(values[0]);
        const session = this.sessions.get(tokenHash);
        if (session) {
          session.revoked = true;
        }
        return [{ affectedRows: session ? 1 : 0 }, []];
      }

      throw new Error(`Unexpected SQL in auth test: ${sql}`);
    },
    getConnection: this.getConnection.bind(this),
  } as unknown as Pool;

  async executeConnection(sql: string, values: unknown[] = []): Promise<[unknown, unknown]> {
    if (sql.includes("WHERE code = 'ADMIN'")) {
      return [[{ id: '1' }], []];
    }
    if (sql.includes('FROM users') && sql.includes('JOIN user_roles')) {
      return [this.hasAdmin ? [{ id: '45' }] : [], []];
    }
    if (sql.includes('INSERT INTO users')) {
      this.lastAdminPasswordHash = String(values[2]);
      return [{ affectedRows: 1 }, []];
    }
    if (sql.includes('LAST_INSERT_ID()')) {
      return [[{ id: '45' }], []];
    }
    if (sql.includes('INSERT INTO user_roles')) {
      return [{ affectedRows: 1 }, []];
    }
    throw new Error(`Unexpected transaction SQL in auth test: ${sql}`);
  }

  getConnection(): unknown {
    return {
      beginTransaction: async () => undefined,
      execute: this.executeConnection.bind(this),
      commit: async () => { this.committed = true; this.hasAdmin = true; },
      rollback: async () => { this.rolledBack = true; },
      release: () => { this.releasedConnections += 1; },
    };
  }

  private credentialRows(): Array<Record<string, string | null>> {
    return [{
      ...this.account,
      role_code: 'AUDITOR',
      permission_code: 'evidence.view',
    }, {
      ...this.account,
      role_code: 'AUDITOR',
      permission_code: 'findings.create',
    }];
  }

  private sessionRows(): Array<Record<string, string | null>> {
    return [{
      session_id: '31',
      user_id: this.account.id,
      full_name: this.account.full_name,
      email: this.account.email,
      department: this.account.department,
      role_code: 'AUDITOR',
      permission_code: 'evidence.view',
    }, {
      session_id: '31',
      user_id: this.account.id,
      full_name: this.account.full_name,
      email: this.account.email,
      department: this.account.department,
      role_code: 'AUDITOR',
      permission_code: 'findings.create',
    }];
  }
}

let app: INestApplication;
let database: FakeDatabase;
let client: ReturnType<typeof supertest.agent>;
let csrfToken: string;
let passwordHash: string;

beforeEach(async () => {
  passwordHash ??= await hashPassword('CorrectHorseBattery123');
  database = new FakeDatabase();
  database.account.password_hash = passwordHash;

  const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(DatabaseService)
    .useValue(database)
    .compile();
  app = moduleRef.createNestApplication();
  app.useLogger(['error']);
  app.enableCors({ origin, credentials: true });
  app.useGlobalPipes(new (await import('@nestjs/common')).ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  await app.init();

  client = supertest.agent(app.getHttpServer());
  const csrfResponse = await client.get('/api/auth/csrf').set('Origin', origin).expect(200);
  csrfToken = csrfResponse.body.csrfToken;
});

afterEach(async () => {
  await app?.close();
});

function login(password = 'CorrectHorseBattery123') {
  return client
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrfToken)
    .send({ email: ` ${database.account.email.toUpperCase()} `, password });
}

test('login creates an HttpOnly session cookie and returns a safe profile', async () => {
  const response = await login();
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.user.id, '17');
  assert.equal(response.body.user.email, 'rohit@example.com');
  assert.deepEqual(response.body.user.roles, ['AUDITOR']);
  assert.deepEqual(response.body.user.permissions, ['evidence.view', 'findings.create']);
  assert.equal('password_hash' in response.body.user, false);
  assert.equal(JSON.stringify(response.body).includes('argon2'), false);
  assert.equal(JSON.stringify(response.body).includes('token'), false);

  const sessionCookie = response.headers['set-cookie'].find((value: string) =>
    value.startsWith('audiverai_session='),
  );
  assert.ok(sessionCookie);
  assert.match(sessionCookie, /HttpOnly/i);
  assert.match(sessionCookie, /SameSite=Strict/i);
  assert.match(sessionCookie, /Path=\/api/i);
  assert.equal(database.sessions.size, 1);
});

test('wrong passwords and unknown emails use the same unauthorized response', async () => {
  const wrongPassword = await login('wrong-password').expect(401);
  const unknownEmail = await client
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrfToken)
    .send({ email: 'unknown@example.com', password: 'wrong-password' })
    .expect(401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
});

test('disabled and locked accounts cannot authenticate', async () => {
  for (const status of ['DISABLED', 'LOCKED']) {
    database.account.status = status;
    await login().expect(401);
  }
});

test('login validates DTOs and requires CSRF protection', async () => {
  await client
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: 'not-an-email', password: 'password' })
    .expect(403);

  await client
    .post('/api/auth/login')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrfToken)
    .send({ email: 'not-an-email', password: 'password', unexpected: true })
    .expect(400);

  await client
    .post('/api/auth/login')
    .set('Origin', 'https://attacker.example')
    .set('X-CSRF-Token', csrfToken)
    .send({ email: database.account.email, password: 'password' })
    .expect(403);
});

test('login rate-limits repeated failures', async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await login('incorrect-password').expect(401);
  }
  await login('incorrect-password').expect(429);
});

test('me requires authentication and returns roles and permissions for a valid session', async () => {
  await client.get('/api/auth/me').set('Origin', origin).expect(401);
  await login().expect(200);
  const response = await client.get('/api/auth/me').set('Origin', origin).expect(200);
  assert.deepEqual(response.body.user.roles, ['AUDITOR']);
  assert.deepEqual(response.body.user.permissions, ['evidence.view', 'findings.create']);
  assert.equal('password_hash' in response.body.user, false);
});

test('logout revokes the session and clears cookies', async () => {
  await login().expect(200);
  const cookie = [...database.sessions.values()][0];
  const response = await client
    .post('/api/auth/logout')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrfToken)
    .expect(204);

  assert.equal(cookie.revoked, true);
  assert.ok(response.headers['set-cookie'].some((value: string) =>
    value.startsWith('audiverai_session=;'),
  ));
  await client.get('/api/auth/me').set('Origin', origin).expect(401);
});

test('revoked and expired sessions are rejected', async () => {
  await login().expect(200);
  const session = [...database.sessions.values()][0];
  session.revoked = true;
  await client.get('/api/auth/me').set('Origin', origin).expect(401);

  session.revoked = false;
  session.expired = true;
  await client.get('/api/auth/me').set('Origin', origin).expect(401);
});

test('permission guard distinguishes missing and insufficient permissions', () => {
  const reflector = {
    getAllAndOverride: () => ['audits.approve'],
  } as unknown as Reflector;
  const guard = new PermissionsGuard(reflector);
  const context = (user: unknown): ExecutionContext => ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ authUser: user }) }),
  } as unknown as ExecutionContext);

  assert.throws(() => guard.canActivate(context(undefined)), /Authentication required/);
  assert.throws(() => guard.canActivate(context({
    permissions: ['audits.view_all'],
  })), (error: unknown) => error instanceof ForbiddenException);
  assert.equal(guard.canActivate(context({
    permissions: ['audits.approve'],
  })), true);
});

test('first-admin provisioning hashes passwords and refuses a second admin', async () => {
  const fakeDatabase = new FakeDatabase();
  const provisioning = new AdminProvisioningService(fakeDatabase as unknown as DatabaseService);
  const credentials: AdminCredentials = {
    fullName: 'First Administrator',
    email: ' ADMIN@example.com ',
    password: 'StrongAdminPassword123',
  };

  assert.equal(await provisioning.provisionFirstAdmin(credentials), '45');
  assert.equal(fakeDatabase.committed, true);
  assert.equal(fakeDatabase.rolledBack, false);
  assert.equal(fakeDatabase.releasedConnections, 1);
  assert.equal(await verifyPassword(fakeDatabase.lastAdminPasswordHash!, credentials.password), true);

  await assert.rejects(
    provisioning.provisionFirstAdmin(credentials),
    (error: unknown) => error instanceof ConflictException,
  );
  assert.equal(fakeDatabase.releasedConnections, 2);
});

test('administrator provisioning enforces the password policy before database writes', async () => {
  const fakeDatabase = new FakeDatabase();
  const provisioning = new AdminProvisioningService(fakeDatabase as unknown as DatabaseService);
  await assert.rejects(
    provisioning.provisionFirstAdmin({
      fullName: 'Admin',
      email: 'admin@example.com',
      password: 'weak',
    }),
    (error: unknown) => error instanceof BadRequestException,
  );
  assert.equal(fakeDatabase.releasedConnections, 0);
});

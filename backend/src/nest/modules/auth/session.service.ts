import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';

import { DatabaseService } from '../../database.service';
import type { AuthSession, RequestMetadata } from './auth.types';
import { AUTH_CONFIGURATION, type AuthConfiguration } from '../../configuration';

interface SessionRow extends RowDataPacket {
  session_id: string;
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  role_code: string | null;
  permission_code: string | null;
}

interface ExpirationRow extends RowDataPacket {
  expires_at_epoch: number | string;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AUTH_CONFIGURATION) private readonly config: AuthConfiguration,
  ) {}

  createToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(
    userId: string,
    token: string,
    metadata: RequestMetadata,
  ): Promise<Date> {
    await this.database.pool.execute(
      `INSERT INTO sessions
        (user_id, token_hash, expires_at, last_activity_at, user_agent, ip_address)
       VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(), INTERVAL ? HOUR), CURRENT_TIMESTAMP(), ?, ?)`,
      [
        userId,
        this.hashToken(token),
        this.config.sessionTtlHours,
        metadata.userAgent?.slice(0, 512) ?? null,
        metadata.ipAddress?.slice(0, 45) ?? null,
      ],
    );
    const [rows] = await this.database.pool.execute<ExpirationRow[]>(
      `SELECT UNIX_TIMESTAMP(expires_at) AS expires_at_epoch
       FROM sessions
       WHERE token_hash = ?`,
      [this.hashToken(token)],
    );
    if (rows.length === 0) {
      throw new Error('Session creation did not produce a readable expiry.');
    }

    return new Date(Number(rows[0].expires_at_epoch) * 1000);
  }

  async authenticate(token: string): Promise<AuthSession | null> {
    const tokenHash = this.hashToken(token);
    const [rows] = await this.database.pool.execute<SessionRow[]>(
      `SELECT
         CAST(s.id AS CHAR) AS session_id,
         CAST(u.id AS CHAR) AS user_id,
         u.full_name,
         u.email,
         u.department,
         r.code AS role_code,
         p.code AS permission_code
       FROM sessions AS s
       JOIN users AS u ON u.id = s.user_id
       LEFT JOIN user_roles AS ur ON ur.user_id = u.id
       LEFT JOIN roles AS r ON r.id = ur.role_id
       LEFT JOIN role_permissions AS rp ON rp.role_id = r.id
       LEFT JOIN permissions AS p ON p.id = rp.permission_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > CURRENT_TIMESTAMP()
         AND u.status = 'ACTIVE'`,
      [tokenHash],
    );

    if (rows.length === 0) {
      return null;
    }

    const sessionId = rows[0].session_id;
    const user = {
      id: rows[0].user_id,
      fullName: rows[0].full_name,
      email: rows[0].email,
      status: 'ACTIVE' as const,
      department: rows[0].department,
      roles: [...new Set(rows.flatMap((row) => row.role_code ? [row.role_code] : []))].sort(),
      permissions: [...new Set(rows.flatMap((row) => row.permission_code ? [row.permission_code] : []))].sort(),
    };

    await this.database.pool.execute(
      `UPDATE sessions
       SET last_activity_at = CURRENT_TIMESTAMP()
       WHERE id = ?
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP()
         AND EXISTS (
           SELECT 1 FROM users
           WHERE users.id = sessions.user_id AND users.status = 'ACTIVE'
         )`,
      [sessionId],
    );

    return { sessionId, user };
  }

  async revoke(token: string): Promise<void> {
    await this.database.pool.execute(
      `UPDATE sessions
       SET revoked_at = CURRENT_TIMESTAMP()
       WHERE token_hash = ? AND revoked_at IS NULL`,
      [this.hashToken(token)],
    );
  }
}

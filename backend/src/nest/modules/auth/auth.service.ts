import { Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';

import { DatabaseService } from '../../database.service';
import { hashPassword, verifyPassword } from './password';
import type { AuthUser, RequestMetadata } from './auth.types';
import { SessionService } from './session.service';

interface CredentialRow extends RowDataPacket {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
  department: string | null;
  role_code: string | null;
  permission_code: string | null;
}

export interface LoginResult {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async login(email: string, password: string, metadata: RequestMetadata): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const [rows] = await this.database.pool.execute<CredentialRow[]>(
      `SELECT
         CAST(u.id AS CHAR) AS id,
         u.full_name,
         u.email,
         u.password_hash,
         u.status,
         u.department,
         r.code AS role_code,
         p.code AS permission_code
       FROM users AS u
       LEFT JOIN user_roles AS ur ON ur.user_id = u.id
       LEFT JOIN roles AS r ON r.id = ur.role_id
       LEFT JOIN role_permissions AS rp ON rp.role_id = r.id
       LEFT JOIN permissions AS p ON p.id = rp.permission_id
       WHERE u.email = ?`,
      [normalizedEmail],
    );

    if (rows.length === 0) {
      await verifyPassword(await this.dummyHash, password);
      throw new UnauthorizedException('Invalid email or password.');
    }

    const account = rows[0];
    let passwordMatches: boolean;
    try {
      passwordMatches = await verifyPassword(account.password_hash, password);
    } catch {
      console.error('Stored password hash verification failed.');
      throw new InternalServerErrorException('Unable to authenticate.');
    }

    if (!passwordMatches || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user: AuthUser = {
      id: account.id,
      fullName: account.full_name,
      email: account.email,
      status: 'ACTIVE',
      department: account.department,
      roles: [...new Set(rows.flatMap((row) => row.role_code ? [row.role_code] : []))].sort(),
      permissions: [...new Set(rows.flatMap((row) => row.permission_code ? [row.permission_code] : []))].sort(),
    };
    const token = this.sessions.createToken();
    const expiresAt = await this.sessions.create(user.id, token, metadata);

    return { user, token, expiresAt };
  }

  async logout(token: string | undefined): Promise<void> {
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      await this.sessions.revoke(token);
    }
  }

}

import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../../database.service';
import { hashPassword, isStrongPassword } from './password';

interface AdminRoleRow extends RowDataPacket {
  id: string;
}

export interface AdminCredentials {
  fullName: string;
  email: string;
  password: string;
}

@Injectable()
export class AdminProvisioningService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async provisionFirstAdmin(credentials: AdminCredentials): Promise<string> {
    const fullName = credentials.fullName.trim();
    const email = credentials.email.trim().toLowerCase();

    if (!fullName || fullName.length > 150 || !isEmail(email)) {
      throw new BadRequestException('A valid full name and email address are required.');
    }

    if (!isStrongPassword(credentials.password)) {
      throw new BadRequestException(
        'Password must be 12-128 characters and include lowercase, uppercase, and numeric characters.',
      );
    }

    const passwordHash = await hashPassword(credentials.password);
    const connection = await this.database.pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [roles] = await connection.execute<AdminRoleRow[]>(
        `SELECT CAST(id AS CHAR) AS id
         FROM roles
         WHERE code = 'ADMIN'
         FOR UPDATE`,
      );

      if (roles.length === 0) {
        throw new ConflictException('The ADMIN role is not seeded.');
      }

      const [existingAdmins] = await connection.execute<RowDataPacket[]>(
        `SELECT users.id
         FROM users
         JOIN user_roles ON user_roles.user_id = users.id
         WHERE user_roles.role_id = ?
         LIMIT 1
         FOR UPDATE`,
        [roles[0].id],
      );

      if (existingAdmins.length > 0) {
        throw new ConflictException('An administrator account has already been provisioned.');
      }

      await connection.execute(
        `INSERT INTO users (full_name, email, password_hash, status)
         VALUES (?, ?, ?, 'ACTIVE')`,
        [fullName, email, passwordHash],
      );
      const [insertedUsers] = await connection.execute<AdminRoleRow[]>(
        'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
      );
      if (insertedUsers.length === 0) {
        throw new Error('Administrator insert did not return a user ID.');
      }

      await connection.execute(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [insertedUsers[0].id, roles[0].id],
      );
      await connection.commit();
      transactionStarted = false;

      return insertedUsers[0].id;
    } catch (error) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

export async function provisionFirstAdmin(
  database: DatabaseService,
  credentials: AdminCredentials,
): Promise<string> {
  return new AdminProvisioningService(database).provisionFirstAdmin(credentials);
}

export function isAdminProvisioningError(error: unknown): error is BadRequestException | ConflictException {
  return error instanceof BadRequestException || error instanceof ConflictException;
}

import type { Request } from 'express';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  status: 'ACTIVE';
  department: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  authSessionId?: string;
}

export interface RequestMetadata {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AuthSession {
  sessionId: string;
  user: AuthUser;
}

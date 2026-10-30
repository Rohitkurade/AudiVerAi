export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  status: 'ACTIVE';
  department: string | null;
  roles: string[];
  permissions: PermissionCode[];
}

export interface AuthResponse {
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CsrfResponse {
  csrfToken: string;
}

export const PERMISSIONS = {
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDITS_CREATE: 'audits.create',
  AUDITS_VIEW_ALL: 'audits.view_all',
  AUDITS_VIEW_ASSIGNED: 'audits.view_assigned',
  AUDITS_ASSIGN: 'audits.assign',
  AUDITS_REVIEW: 'audits.review',
  AUDITS_APPROVE: 'audits.approve',
  EVIDENCE_VIEW: 'evidence.view',
  EVIDENCE_UPLOAD: 'evidence.upload',
  FINDINGS_CREATE: 'findings.create',
  FINDINGS_MANAGE: 'findings.manage',
  FINDINGS_RESPOND: 'findings.respond',
  REPORTS_VIEW: 'reports.view',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_APPROVE: 'reports.approve'
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

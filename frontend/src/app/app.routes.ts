import { Routes } from '@angular/router';

import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guards';
import { PERMISSIONS, PermissionCode } from './core/auth/auth.models';

const auditViewPermissions = [
  PERMISSIONS.AUDITS_VIEW_ALL,
  PERMISSIONS.AUDITS_VIEW_ASSIGNED
] satisfies PermissionCode[];

const findingsPermissions = [
  PERMISSIONS.FINDINGS_CREATE,
  PERMISSIONS.FINDINGS_MANAGE,
  PERMISSIONS.FINDINGS_RESPOND
] satisfies PermissionCode[];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login').then((module) => module.LoginPage) },
  { path: 'forbidden', loadComponent: () => import('./features/auth/forbidden').then((module) => module.ForbiddenPage) },
  {
    path: 'dashboard',
    canActivate: [authGuard, permissionGuard],
    data: { permissions: auditViewPermissions },
    loadComponent: () => import('./features/dashboard/dashboard').then((module) => module.DashboardPage)
  },
  {
    path: 'audits',
    canActivate: [authGuard, permissionGuard],
    data: { permissions: auditViewPermissions },
    loadComponent: () => import('./features/audits/audits').then((module) => module.AuditsPage)
  },
  {
    path: 'evidence',
    canActivate: [authGuard, permissionGuard],
    data: { permissions: [PERMISSIONS.EVIDENCE_VIEW] },
    loadComponent: () => import('./features/evidence/evidence').then((module) => module.EvidencePage)
  },
  {
    path: 'findings',
    canActivate: [authGuard, permissionGuard],
    data: { permissions: findingsPermissions },
    loadComponent: () => import('./features/findings/findings').then((module) => module.FindingsPage)
  },
  {
    path: 'copilot',
    canActivate: [authGuard],
    loadComponent: () => import('./features/copilot/copilot').then((module) => module.CopilotPage)
  },
  { path: '**', redirectTo: 'dashboard' }
];

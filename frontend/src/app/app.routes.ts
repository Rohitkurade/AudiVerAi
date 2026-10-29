import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then((module) => module.DashboardPage) },
  { path: 'audits', loadComponent: () => import('./features/audits/audits').then((module) => module.AuditsPage) },
  { path: 'evidence', loadComponent: () => import('./features/evidence/evidence').then((module) => module.EvidencePage) },
  { path: 'findings', loadComponent: () => import('./features/findings/findings').then((module) => module.FindingsPage) },
  { path: 'copilot', loadComponent: () => import('./features/copilot/copilot').then((module) => module.CopilotPage) },
  { path: '**', redirectTo: 'dashboard' }
];

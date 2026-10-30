import { Component, signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { authGuard, guestGuard, permissionGuard } from './auth.guards';
import { AuthService } from './auth.service';
import { AuthUser, PermissionCode } from './auth.models';

@Component({ standalone: true, template: '<span>Test route</span>' })
class TestRoute {}

const authenticatedUser: AuthUser = {
  id: '5',
  fullName: 'Taylor Auditor',
  email: 'taylor@example.com',
  status: 'ACTIVE',
  department: null,
  roles: ['AUDITOR'],
  permissions: ['audits.view_assigned']
};

describe('authentication and permission route guards', () => {
  const authState = signal<AuthUser | null>(null);
  const authMock = {
    user: authState,
    restoreSession: vi.fn(async () => undefined),
    hasAnyPermission: (permissions: readonly PermissionCode[]) =>
      permissions.some((permission) => authState()?.permissions.includes(permission))
  };

  async function createHarness(): Promise<RouterTestingHarness> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'protected', canActivate: [authGuard, permissionGuard], data: { permissions: ['audits.view_assigned'] }, component: TestRoute },
          { path: 'login', canActivate: [guestGuard], component: TestRoute },
          { path: 'forbidden', component: TestRoute }
        ]),
        { provide: AuthService, useValue: authMock }
      ]
    });
    return RouterTestingHarness.create();
  }

  it('redirects unauthenticated users to login while preserving the requested URL', async () => {
    authState.set(null);
    const harness = await createHarness();

    await harness.navigateByUrl('/protected?tab=assigned', TestRoute);

    expect(TestBed.inject(Router).url).toContain('/login?returnUrl=%2Fprotected%3Ftab%3Dassigned');
    expect(authMock.restoreSession).toHaveBeenCalled();
  });

  it('redirects authenticated guests away from login to a safe return URL', async () => {
    authState.set(authenticatedUser);
    const harness = await createHarness();

    await harness.navigateByUrl('/login?returnUrl=%2Fprotected', TestRoute);

    expect(TestBed.inject(Router).url).toBe('/protected');
  });

  it('blocks users without the required permission and allows users with it', async () => {
    const harness = await createHarness();
    authState.set({ ...authenticatedUser, permissions: [] });
    await harness.navigateByUrl('/protected', TestRoute);
    expect(TestBed.inject(Router).url).toBe('/forbidden?returnUrl=%2Fprotected');

    authState.set(authenticatedUser);
    await harness.navigateByUrl('/protected', TestRoute);
    expect(TestBed.inject(Router).url).toBe('/protected');
  });
});

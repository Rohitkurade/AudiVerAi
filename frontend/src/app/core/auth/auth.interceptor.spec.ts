import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiUrl } from './auth.config';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { AuthUser, PermissionCode } from './auth.models';

@Component({ standalone: true, template: '' })
class LoginRoute {}

const user: AuthUser = {
  id: '8',
  fullName: 'Morgan Admin',
  email: 'morgan@example.com',
  status: 'ACTIVE',
  department: null,
  roles: ['ADMIN'],
  permissions: ['users.manage']
};

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  const authUser = signal<AuthUser | null>(null);
  const markSessionExpired = vi.fn();

  beforeEach(() => {
    authUser.set(null);
    markSessionExpired.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', component: LoginRoute }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            user: authUser,
            markSessionExpired
          }
        }
      ]
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adds credentials and the signed CSRF header to unsafe API requests', async () => {
    const response = firstValueFrom(httpClient.post(apiUrl('/api/auth/login'), { email: user.email }));
    const csrf = http.expectOne(apiUrl('/api/auth/csrf'));
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ csrfToken: 'signed-token' });

    const request = http.expectOne(apiUrl('/api/auth/login'));
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('signed-token');
    request.flush({ user });
    await response;
  });

  it('clears authentication on 401 but leaves 403 responses as authorization failures', async () => {
    authUser.set(user);
    const unauthorized = firstValueFrom(httpClient.get(apiUrl('/api/private')));
    http.expectOne(apiUrl('/api/private')).flush(
      { message: 'Authentication required.' },
      { status: 401, statusText: 'Unauthorized' }
    );
    await expect(unauthorized).rejects.toMatchObject({ status: 401 });
    expect(markSessionExpired).toHaveBeenCalledOnce();

    markSessionExpired.mockClear();
    const forbidden = firstValueFrom(httpClient.get(apiUrl('/api/private')));
    http.expectOne(apiUrl('/api/private')).flush(
      { message: 'Insufficient permissions.' },
      { status: 403, statusText: 'Forbidden' }
    );
    await expect(forbidden).rejects.toMatchObject({ status: 403 });
    expect(markSessionExpired).not.toHaveBeenCalled();
  });
});

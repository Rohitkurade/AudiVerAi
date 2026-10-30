import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { apiUrl } from './auth.config';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.models';

const user: AuthUser = {
  id: '12',
  fullName: 'Jordan Lee',
  email: 'jordan@example.com',
  status: 'ACTIVE',
  department: 'Internal Audit',
  roles: ['AUDITOR'],
  permissions: ['audits.view_assigned', 'evidence.view']
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches a CSRF token and logs in without persisting the session token', async () => {
    const login = auth.login({ email: user.email, password: 'Never stored' });

    const csrf = http.expectOne(apiUrl('/api/auth/csrf'));
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ csrfToken: 'signed-csrf-token' });

    const request = http.expectOne(apiUrl('/api/auth/login'));
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('signed-csrf-token');
    expect(request.request.body).toEqual({ email: user.email, password: 'Never stored' });
    request.flush({ user });

    await expect(login).resolves.toEqual(user);
    expect(auth.user()).toEqual(user);
    expect(auth.status()).toBe('authenticated');
    expect(Object.keys(auth.user() ?? {})).not.toContain('password_hash');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('leaves the user anonymous after invalid credentials', async () => {
    const login = auth.login({ email: 'unknown@example.com', password: 'bad-password' });
    http.expectOne(apiUrl('/api/auth/csrf')).flush({ csrfToken: 'signed-csrf-token' });
    http.expectOne(apiUrl('/api/auth/login')).flush(
      { message: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' }
    );

    await expect(login).rejects.toMatchObject({ status: 401 });
    expect(auth.user()).toBeNull();
  });

  it('restores a session once after application startup', async () => {
    const firstRestore = auth.restoreSession();
    const secondRestore = auth.restoreSession();
    const request = http.expectOne(apiUrl('/api/auth/me'));
    expect(request.request.withCredentials).toBe(true);
    request.flush({ user });

    await Promise.all([firstRestore, secondRestore]);
    expect(auth.user()).toEqual(user);
    expect(auth.status()).toBe('authenticated');
    http.expectNone(apiUrl('/api/auth/me'));
  });

  it('treats a 401 during session restoration as an expired anonymous session', async () => {
    const restore = auth.restoreSession();
    http.expectOne(apiUrl('/api/auth/me')).flush(
      { message: 'Authentication required.' },
      { status: 401, statusText: 'Unauthorized' }
    );

    await restore;
    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });

  it('revokes the server session and clears frontend state on logout', async () => {
    const login = auth.login({ email: user.email, password: 'test-password' });
    http.expectOne(apiUrl('/api/auth/csrf')).flush({ csrfToken: 'signed-csrf-token' });
    http.expectOne(apiUrl('/api/auth/login')).flush({ user });
    await login;

    const logout = auth.logout();
    const request = http.expectOne(apiUrl('/api/auth/logout'));
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('signed-csrf-token');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(logout).resolves.toBe(true);
    expect(auth.user()).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });
});

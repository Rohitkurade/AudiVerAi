import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './auth.config';
import { AuthResponse, AuthUser, LoginRequest, PermissionCode } from './auth.models';
import { CsrfTokenService } from './csrf-token.service';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfTokenService);
  private restoration: Promise<void> | null = null;

  readonly status = signal<AuthStatus>('loading');
  readonly user = signal<AuthUser | null>(null);
  readonly error = signal<string | null>(null);

  restoreSession(): Promise<void> {
    if (!this.restoration) {
      this.restoration = this.loadCurrentUser();
    }
    return this.restoration;
  }

  async login(credentials: LoginRequest): Promise<AuthUser> {
    this.error.set(null);
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(apiUrl('/api/auth/login'), credentials)
    );
    this.setAuthenticated(response.user);
    return response.user;
  }

  async logout(): Promise<boolean> {
    this.error.set(null);
    try {
      await firstValueFrom(this.http.post<void>(apiUrl('/api/auth/logout'), null));
      this.setAnonymous();
      this.csrf.clear();
      return true;
    } catch {
      this.setAnonymous();
      this.csrf.clear();
      this.error.set('Sign-out could not be confirmed by the server. Your local session has been cleared.');
      return false;
    }
  }

  hasPermission(permission: PermissionCode): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  hasAnyPermission(permissions: readonly PermissionCode[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: readonly PermissionCode[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  markSessionExpired(): void {
    this.setAnonymous();
    this.error.set('Your session has expired. Sign in again to continue.');
  }

  clearError(): void {
    this.error.set(null);
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<AuthResponse>(apiUrl('/api/auth/me'))
      );
      this.setAuthenticated(response.user);
    } catch (error: unknown) {
      this.setAnonymous();
      if (!(error instanceof HttpErrorResponse && error.status === 401)) {
        this.error.set('Could not restore your session. Check the API connection and sign in again.');
      }
    }
  }

  private setAuthenticated(user: AuthUser): void {
    this.user.set(user);
    this.status.set('authenticated');
    this.error.set(null);
  }

  private setAnonymous(): void {
    this.user.set(null);
    this.status.set('anonymous');
  }
}

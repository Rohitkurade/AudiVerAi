import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';

import { apiUrl } from './auth.config';
import { CsrfResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class CsrfTokenService {
  private readonly http = inject(HttpClient);
  private token: string | null = null;
  private tokenRequest: Observable<string> | null = null;

  getToken(): Observable<string> {
    if (this.token) {
      return of(this.token);
    }

    if (!this.tokenRequest) {
      this.tokenRequest = this.http.get<CsrfResponse>(apiUrl('/api/auth/csrf')).pipe(
        map((response) => {
          if (typeof response.csrfToken !== 'string' || response.csrfToken.length === 0) {
            throw new Error('The authentication API returned an invalid CSRF token.');
          }
          return response.csrfToken;
        }),
        tap((token) => {
          this.token = token;
        }),
        catchError((error: unknown) => {
          this.tokenRequest = null;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.tokenRequest;
  }

  clear(): void {
    this.token = null;
    this.tokenRequest = null;
  }
}

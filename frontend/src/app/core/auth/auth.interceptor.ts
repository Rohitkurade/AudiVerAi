import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { isAuthApiRequest } from './auth.config';
import { CsrfTokenService } from './csrf-token.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isAuthApiRequest(request.url)) {
    return next(request);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const requestWithCredentials = request.clone({ withCredentials: true });
  const csrf = inject(CsrfTokenService);
  const outgoingRequest$ = SAFE_METHODS.has(request.method)
    ? next(requestWithCredentials)
    : csrf.getToken().pipe(
      switchMap((token) => next(requestWithCredentials.clone({
        setHeaders: { 'X-CSRF-Token': token }
      })))
    );

  return outgoingRequest$.pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse
        && error.status === 401
        && auth.user()
        && router.url !== '/login'
      ) {
        const returnUrl = router.url;
        auth.markSessionExpired();
        void router.navigate(['/login'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    })
  );
};

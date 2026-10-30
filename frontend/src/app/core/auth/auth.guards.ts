import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { PermissionCode } from './auth.models';

export function safeReturnUrl(router: Router, value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
    return '/dashboard';
  }
  return router.serializeUrl(router.parseUrl(value));
}

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restoreSession();
  return auth.user()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restoreSession();
  if (!auth.user()) {
    return true;
  }
  return router.parseUrl(safeReturnUrl(router, route.queryParamMap.get('returnUrl')));
};

export const permissionGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.restoreSession();

  if (!auth.user()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const permissions = route.data['permissions'] as readonly PermissionCode[] | undefined;
  return !permissions?.length || auth.hasAnyPermission(permissions)
    ? true
    : router.createUrlTree(['/forbidden'], { queryParams: { returnUrl: state.url } });
};

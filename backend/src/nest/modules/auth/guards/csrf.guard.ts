import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { parse } from 'cookie';
import type { Request } from 'express';

import { getCorsOrigin } from '../../../configuration';
import { CsrfService } from '../csrf.service';

export const CSRF_COOKIE_NAME = 'audiverai_csrf';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(CsrfService) private readonly csrf: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const origin = request.get('origin') ?? this.getRefererOrigin(request);
    const cookieHeader = request.headers.cookie;
    const csrfCookie = cookieHeader ? parse(cookieHeader)[CSRF_COOKIE_NAME] : undefined;

    if (
      origin !== getCorsOrigin()
      || !this.csrf.isValid(csrfCookie, request.get('x-csrf-token'))
    ) {
      throw new ForbiddenException('Invalid CSRF token or request origin.');
    }

    return true;
  }

  private getRefererOrigin(request: Request): string | undefined {
    const referer = request.get('referer');
    if (!referer) {
      return undefined;
    }

    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
}

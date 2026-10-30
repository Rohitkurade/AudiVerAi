import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { parse } from 'cookie';

import { SessionService } from '../session.service';
import type { AuthenticatedRequest } from '../auth.types';

export const SESSION_COOKIE_NAME = 'audiverai_session';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieHeader = request.headers.cookie;
    const token = cookieHeader ? parse(cookieHeader)[SESSION_COOKIE_NAME] : undefined;

    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new UnauthorizedException('Authentication required.');
    }

    const session = await this.sessions.authenticate(token);
    if (!session) {
      throw new UnauthorizedException('Authentication required.');
    }

    request.authUser = session.user;
    request.authSessionId = session.sessionId;
    return true;
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { parse } from 'cookie';
import type { Request, Response } from 'express';

import { AUTH_CONFIGURATION, type AuthConfiguration } from '../../configuration';
import { AuthService } from './auth.service';
import { LoginDto } from './auth.dto';
import { CsrfService } from './csrf.service';
import { AuthGuard, SESSION_COOKIE_NAME } from './guards/auth.guard';
import { CSRF_COOKIE_NAME } from './guards/csrf.guard';
import type { AuthenticatedRequest, AuthUser, RequestMetadata } from './auth.types';

const COOKIE_PATH = '/api';

@Controller('api/auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(CsrfService) private readonly csrf: CsrfService,
    @Inject(AUTH_CONFIGURATION) private readonly config: AuthConfiguration,
  ) {}

  @Get('csrf')
  getCsrfToken(@Res({ passthrough: true }) response: Response): { csrfToken: string } {
    const token = this.csrf.issueToken();
    response.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: this.config.secureCookies,
      sameSite: 'strict',
      path: COOKIE_PATH,
    });
    return { csrfToken: token };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    const result = await this.auth.login(dto.email, dto.password, this.getMetadata(request));
    response.cookie(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: 'strict',
      path: COOKIE_PATH,
      expires: result.expiresAt,
    });
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = request.headers.cookie
      ? parse(request.headers.cookie)[SESSION_COOKIE_NAME]
      : undefined;
    await this.auth.logout(token);
    const cookieOptions = {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: 'strict' as const,
      path: COOKIE_PATH,
    };
    response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    response.clearCookie(CSRF_COOKIE_NAME, { ...cookieOptions, httpOnly: false });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ user: NonNullable<AuthenticatedRequest['authUser']> }> {
    if (!request.authUser) {
      throw new UnauthorizedException('Authentication required.');
    }

    const user = request.authUser;
    return { user };
  }

  private getMetadata(request: Request): RequestMetadata {
    return {
      userAgent: request.get('user-agent') ?? null,
      ipAddress: request.ip ?? null,
    };
  }
}

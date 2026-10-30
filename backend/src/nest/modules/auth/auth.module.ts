import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AUTH_CONFIGURATION, getAuthConfiguration } from '../../configuration';
import { DatabaseModule } from '../../database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { AuthGuard } from './guards/auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SessionService } from './session.service';

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    CsrfService,
    AuthGuard,
    CsrfGuard,
    PermissionsGuard,
    { provide: AUTH_CONFIGURATION, useFactory: getAuthConfiguration },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthGuard, PermissionsGuard, SessionService],
})
export class AuthModule {}

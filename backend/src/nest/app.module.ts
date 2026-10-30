import { Module } from '@nestjs/common';

import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}

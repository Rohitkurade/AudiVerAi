import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from './database.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly database: DatabaseService) {}

  @Get()
  getLiveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async getReadiness(): Promise<{ status: 'ok'; database: 'connected' }> {
    try {
      await this.database.checkConnection();
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      this.logger.error(
        'Database readiness check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException({ status: 'error', database: 'unavailable' });
    }
  }
}

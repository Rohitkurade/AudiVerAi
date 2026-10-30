import { Injectable, OnModuleDestroy } from '@nestjs/common';
import mysql, { Pool } from 'mysql2/promise';

import { getDatabaseConfig } from './configuration';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    this.pool = mysql.createPool(getDatabaseConfig());
  }

  async checkConnection(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

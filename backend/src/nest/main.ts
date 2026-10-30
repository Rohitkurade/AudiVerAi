import 'reflect-metadata';

import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'node:path';

import { AppModule } from './app.module';
import { getCorsOrigin, parsePort } from './configuration';

config({ path: resolve(__dirname, '../../../.env') });

async function bootstrap(): Promise<void> {
  const port = parsePort(process.env.NEST_PORT, 3001, 'NEST_PORT');
  const origin = getCorsOrigin();
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });

  app.enableShutdownHooks();
  app.enableCors({ origin });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      level: 'error',
      message: 'NestJS API failed to start',
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});

import type { PoolOptions } from 'mysql2/promise';

export function parsePort(value: string | undefined, defaultValue: number, name: string): number {
  const port = value === undefined ? defaultValue : Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }

  return port;
}

export function getCorsOrigin(): string {
  const origin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';
  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new Error('CORS_ORIGIN must be a valid HTTP or HTTPS origin.');
  }

  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
    throw new Error('CORS_ORIGIN must be a valid HTTP or HTTPS origin.');
  }

  return origin;
}

export function getDatabaseConfig(): PoolOptions {
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parsePort(process.env.DB_PORT, 3306, 'DB_PORT'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? 'audiverai',
    waitForConnections: true,
    connectionLimit: 10,
  };
}

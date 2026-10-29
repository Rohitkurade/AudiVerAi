import mysql from 'mysql2/promise';

const port = Number(process.env.DB_PORT ?? 3306);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535.');
}

export const database = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? 'audiverai',
  waitForConnections: true,
  connectionLimit: 10,
});

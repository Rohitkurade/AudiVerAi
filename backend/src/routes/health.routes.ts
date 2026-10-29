import { Router } from 'express';

import { database } from '../config/database';

export const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

healthRouter.get('/health/db', async (_request, response) => {
  try {
    await database.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error);
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

import cors from 'cors';
import express from 'express';

import { healthRouter } from './routes/health.routes';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json());
app.use(healthRouter);

import { Router } from 'express';
import { routerClient } from '../router-client/instance.js';
import { runDiagnostics } from '../services/diagnosticsService.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const diagnosticsRoutes = Router();

diagnosticsRoutes.post(
  '/diagnostics',
  asyncRoute(async (_req, res) => {
    const result = await runDiagnostics(routerClient);
    res.json({ result });
  })
);

import { Router } from 'express';
import { routerClient } from '../router-client/instance.js';
import { getSystemInfo } from '../router-client/endpoints/status.js';
import { getWanStatus } from '../router-client/endpoints/wan.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const dashboardRoutes = Router();

dashboardRoutes.get(
  '/dashboard',
  asyncRoute(async (_req, res) => {
    const [system, wan] = await Promise.all([getSystemInfo(routerClient), getWanStatus(routerClient)]);
    res.json({ system, wan });
  })
);

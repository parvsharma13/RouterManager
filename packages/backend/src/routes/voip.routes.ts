import { Router } from 'express';
import { routerClient } from '../router-client/instance.js';
import { getVoipLines } from '../router-client/endpoints/voip.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const voipRoutes = Router();

voipRoutes.get(
  '/voip',
  asyncRoute(async (_req, res) => {
    const lines = await getVoipLines(routerClient);
    res.json({ lines });
  })
);

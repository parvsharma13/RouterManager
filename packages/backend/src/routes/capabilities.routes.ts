import { Router } from 'express';
import { routerClient } from '../router-client/instance.js';
import { detectCapabilities } from '../capabilities/detect.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const capabilitiesRoutes = Router();

capabilitiesRoutes.get(
  '/capabilities',
  asyncRoute(async (req, res) => {
    const forceRefresh = req.query.refresh === 'true';
    const { capabilities, compatibility } = await detectCapabilities(routerClient, forceRefresh);
    res.json({ capabilities, compatibility });
  })
);

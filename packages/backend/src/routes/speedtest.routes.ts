import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { runSpeedTest } from '../services/speedTest.js';

export const speedTestRoutes = Router();

// POST, not GET — this has a real side effect (tens of MB of network traffic), same
// convention as /system/reboot being a POST despite taking no body.
speedTestRoutes.post(
  '/speedtest',
  asyncRoute(async (_req, res) => {
    const result = await runSpeedTest();
    res.json({ result });
  })
);

import { Router } from 'express';
import { z } from 'zod';
import { routerClient } from '../router-client/instance.js';
import { getWlanBands, updateWlanBand } from '../router-client/endpoints/wlan.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const wlanRoutes = Router();

wlanRoutes.get(
  '/wlan',
  asyncRoute(async (_req, res) => {
    const bands = await getWlanBands(routerClient);
    res.json({ bands });
  })
);

const updateSchema = z.object({
  index: z.number(),
  ssid: z.string().min(1).max(32).optional(),
  psk: z.string().min(8).max(63).optional(),
  enabled: z.boolean().optional(),
  hidden: z.boolean().optional(),
});

wlanRoutes.put(
  '/wlan',
  asyncRoute(async (req, res) => {
    const update = updateSchema.parse(req.body);
    await updateWlanBand(routerClient, update);
    res.json({ ok: true });
  })
);

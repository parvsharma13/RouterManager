import { Router } from 'express';
import { z } from 'zod';
import { routerClient } from '../router-client/instance.js';
import { getQosSettings, updateQosSettings } from '../router-client/endpoints/qos.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const qosRoutes = Router();

qosRoutes.get(
  '/qos',
  asyncRoute(async (_req, res) => {
    const settings = await getQosSettings(routerClient);
    res.json({ settings });
  })
);

const updateSchema = z.object({
  enable: z.boolean().optional(),
  upRate: z.number().optional(),
  downRate: z.number().optional(),
});

qosRoutes.put(
  '/qos',
  asyncRoute(async (req, res) => {
    const update = updateSchema.parse(req.body);
    await updateQosSettings(routerClient, update);
    res.json({ ok: true });
  })
);

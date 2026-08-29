import { Router } from 'express';
import { z } from 'zod';
import { routerClient } from '../router-client/instance.js';
import { getDdnsConfig, updateDdnsConfig } from '../router-client/endpoints/ddns.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const ddnsRoutes = Router();

ddnsRoutes.get(
  '/ddns',
  asyncRoute(async (_req, res) => {
    const config = await getDdnsConfig(routerClient);
    res.json({ config });
  })
);

const updateSchema = z.object({
  enable: z.boolean(),
  provider: z.string(),
  hostname: z.string(),
  username: z.string(),
  password: z.string(),
});

ddnsRoutes.put(
  '/ddns',
  asyncRoute(async (req, res) => {
    const update = updateSchema.parse(req.body);
    await updateDdnsConfig(routerClient, update);
    res.json({ ok: true });
  })
);

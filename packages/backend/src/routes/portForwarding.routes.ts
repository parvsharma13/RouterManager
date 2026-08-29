import { Router } from 'express';
import { z } from 'zod';
import { routerClient } from '../router-client/instance.js';
import { getPortForwardingRules, addPortForwardingRule, deletePortForwardingRule } from '../router-client/endpoints/portForwarding.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const portForwardingRoutes = Router();

portForwardingRoutes.get(
  '/port-forwarding',
  asyncRoute(async (_req, res) => {
    const rules = await getPortForwardingRules(routerClient);
    res.json({ rules });
  })
);

const ruleSchema = z.object({
  name: z.string().min(1),
  protocol: z.enum(['TCP', 'UDP', 'TCP/UDP']),
  externalPort: z.string().min(1),
  internalIp: z.string().min(1),
  internalPort: z.string().min(1),
  enable: z.boolean(),
});

portForwardingRoutes.post(
  '/port-forwarding',
  asyncRoute(async (req, res) => {
    const rule = ruleSchema.parse(req.body);
    await addPortForwardingRule(routerClient, rule);
    res.json({ ok: true });
  })
);

portForwardingRoutes.delete(
  '/port-forwarding/:index',
  asyncRoute(async (req, res) => {
    await deletePortForwardingRule(routerClient, Number(req.params.index));
    res.json({ ok: true });
  })
);

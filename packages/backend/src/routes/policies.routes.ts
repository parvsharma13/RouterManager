import { Router } from 'express';
import { z } from 'zod';
import { routerClient } from '../router-client/instance.js';
import { getAccessControlRaw } from '../router-client/endpoints/accessControl.js';
import { applyPolicy, removePolicyEnforcement } from '../services/policyEngine.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import {
  listPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicy,
  PolicyConflictError,
  type CreatePolicyInput,
} from '../store/policyStore.js';

export const policiesRoutes = Router();

policiesRoutes.get(
  '/policies',
  asyncRoute(async (_req, res) => {
    res.json({ policies: listPolicies() });
  })
);

// Raw passthrough of the router's own access-control OIDs, same "show JSON, don't fake a
// form" convention as Firewall/USB pages, see accessControl.ts for why these shapes are
// unconfirmed. Useful for manually reverse-engineering the real field names live.
policiesRoutes.get(
  '/policies/raw',
  asyncRoute(async (_req, res) => {
    const raw = await getAccessControlRaw(routerClient);
    res.json(raw);
  })
);

const targetTypeSchema = z.enum(['device', 'group']);
const dayOfWeekSchema = z.number().int().min(0).max(6);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM (24h)');

const createPolicySchema = z.discriminatedUnion('type', [
  z.object({
    targetType: targetTypeSchema,
    targetId: z.string().min(1),
    type: z.literal('pause'),
    enabled: z.boolean().optional(),
  }),
  z.object({
    targetType: targetTypeSchema,
    targetId: z.string().min(1),
    type: z.literal('schedule'),
    days: z.array(dayOfWeekSchema).min(1),
    startTime: timeSchema,
    endTime: timeSchema,
    enabled: z.boolean().optional(),
  }),
]);

policiesRoutes.post(
  '/policies',
  asyncRoute(async (req, res) => {
    const input = createPolicySchema.parse(req.body);
    let policy;
    try {
      policy = createPolicy({ ...input, enabled: input.enabled ?? true } as CreatePolicyInput);
    } catch (err) {
      if (err instanceof PolicyConflictError) {
        res.status(409).json({ code: 'INVALID_INPUT', message: err.message });
        return;
      }
      throw err;
    }
    const enforcement = await applyPolicy(routerClient, policy);
    res.json({ policy: { ...policy, enforcement } });
  })
);

const updatePolicySchema = z.object({
  enabled: z.boolean().optional(),
  days: z.array(dayOfWeekSchema).min(1).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
});

policiesRoutes.patch(
  '/policies/:id',
  asyncRoute(async (req, res) => {
    const input = updatePolicySchema.parse(req.body);
    const updated = updatePolicy(Number(req.params.id), input);
    if (!updated) {
      res.status(404).json({ code: 'INVALID_INPUT', message: 'No such policy' });
      return;
    }
    const enforcement = await applyPolicy(routerClient, updated);
    res.json({ policy: { ...updated, enforcement } });
  })
);

policiesRoutes.delete(
  '/policies/:id',
  asyncRoute(async (req, res) => {
    const policy = getPolicy(Number(req.params.id));
    if (policy) {
      await removePolicyEnforcement(routerClient, policy);
    }
    const ok = deletePolicy(Number(req.params.id));
    if (!ok) {
      res.status(404).json({ code: 'INVALID_INPUT', message: 'No such policy' });
      return;
    }
    res.json({ ok: true });
  })
);

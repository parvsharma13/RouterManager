import { Router } from 'express';
import { z } from 'zod';
import { getNotificationPreferences, updateNotificationPreferences } from '../store/notificationStore.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const notificationsRoutes = Router();

const updateSchema = z.object({
  newDevices: z.boolean().optional(),
  routerOffline: z.boolean().optional(),
  backgroundChecks: z.boolean().optional(),
  intervalMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
});

notificationsRoutes.get(
  '/notifications',
  asyncRoute(async (_req, res) => {
    res.json({ preferences: getNotificationPreferences() });
  })
);

notificationsRoutes.patch(
  '/notifications',
  asyncRoute(async (req, res) => {
    const updates = updateSchema.parse(req.body);
    res.json({ preferences: updateNotificationPreferences(updates) });
  })
);

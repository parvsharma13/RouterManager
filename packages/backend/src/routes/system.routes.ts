import { Router } from 'express';
import { z } from 'zod';
import { routerClient } from '../router-client/instance.js';
import { getAdminAccountInfo, getRemoteManagementInfo, rebootRouter, changeAdminPassword } from '../router-client/endpoints/system.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const systemRoutes = Router();

systemRoutes.get(
  '/system',
  asyncRoute(async (_req, res) => {
    const [account, remoteManagement] = await Promise.all([
      getAdminAccountInfo(routerClient),
      getRemoteManagementInfo(routerClient), // display-only — see docs/api-notes.md, never written to
    ]);
    res.json({ account, remoteManagement });
  })
);

systemRoutes.post(
  '/system/reboot',
  asyncRoute(async (_req, res) => {
    await rebootRouter(routerClient);
    res.json({ ok: true });
  })
);

const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

systemRoutes.post(
  '/system/change-password',
  asyncRoute(async (req, res) => {
    const { oldPassword, newPassword } = passwordChangeSchema.parse(req.body);
    await changeAdminPassword(routerClient, oldPassword, newPassword);
    res.json({ ok: true });
  })
);

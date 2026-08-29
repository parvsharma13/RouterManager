import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../middleware/errorHandler.js';
import { listGroups, createGroup, updateGroup, deleteGroup, getGroup } from '../store/groupStore.js';
import { clearGroupFromDevices } from '../store/deviceStore.js';
import { DEVICE_ICON_SCHEMA } from './shared/deviceIcon.js';

export const groupsRoutes = Router();

groupsRoutes.get(
  '/groups',
  asyncRoute(async (_req, res) => {
    res.json({ groups: listGroups() });
  })
);

const createGroupSchema = z.object({
  name: z.string().min(1).max(60),
  icon: DEVICE_ICON_SCHEMA.nullable().optional(),
});

groupsRoutes.post(
  '/groups',
  asyncRoute(async (req, res) => {
    const input = createGroupSchema.parse(req.body);
    const group = createGroup(input.name, input.icon ?? null);
    res.json({ group });
  })
);

const updateGroupSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: DEVICE_ICON_SCHEMA.nullable().optional(),
});

groupsRoutes.patch(
  '/groups/:id',
  asyncRoute(async (req, res) => {
    const input = updateGroupSchema.parse(req.body);
    const group = updateGroup(Number(req.params.id), input);
    if (!group) {
      res.status(404).json({ code: 'INVALID_INPUT', message: 'No such group' });
      return;
    }
    res.json({ group });
  })
);

groupsRoutes.delete(
  '/groups/:id',
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    // Devices in the group aren't deleted, they just fall out of the group (matches the
    // ON DELETE SET NULL foreign key, made explicit here so callers don't need to know that).
    clearGroupFromDevices(id);
    const ok = deleteGroup(id);
    if (!ok) {
      res.status(404).json({ code: 'INVALID_INPUT', message: 'No such group' });
      return;
    }
    res.json({ ok: true });
  })
);

groupsRoutes.get(
  '/groups/:id',
  asyncRoute(async (req, res) => {
    const group = getGroup(Number(req.params.id));
    if (!group) {
      res.status(404).json({ code: 'INVALID_INPUT', message: 'No such group' });
      return;
    }
    res.json({ group });
  })
);

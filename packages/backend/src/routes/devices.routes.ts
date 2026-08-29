import { Router } from 'express';
import { z } from 'zod';
import type { ManagedDevice } from '@router-manager/shared';
import { routerClient } from '../router-client/instance.js';
import { getDevices } from '../router-client/endpoints/devices.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { listOverlays, upsertOverlay, markSeen } from '../store/deviceStore.js';
import { listRecentEvents } from '../store/eventStore.js';
import { DEVICE_ICON_SCHEMA } from './shared/deviceIcon.js';

export const devicesRoutes = Router();

const NEW_DEVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

devicesRoutes.get(
  '/devices',
  asyncRoute(async (_req, res) => {
    const liveDevices = await getDevices(routerClient);
    const overlays = listOverlays();

    const devices: ManagedDevice[] = liveDevices.map((d) => {
      const overlay = overlays.get(d.macAddress) ?? null;
      const seen = markSeen(d.macAddress, overlay?.customName ?? d.hostName, d.active);
      const isNew = Date.now() - new Date(seen.firstSeenAt).getTime() < NEW_DEVICE_WINDOW_MS;
      return {
        macAddress: d.macAddress,
        hostName: d.hostName,
        customName: overlay?.customName ?? null,
        displayName: overlay?.customName || d.hostName,
        ipAddress: d.ipAddress,
        active: d.active,
        interfaceType: d.interfaceType,
        connectionType: d.connectionType,
        signalStrength: d.signalStrength,
        icon: overlay?.icon ?? null,
        notes: overlay?.notes ?? null,
        groupId: overlay?.groupId ?? null,
        isNew,
        firstSeenAt: seen.firstSeenAt,
        lastSeenAt: seen.lastSeenAt,
      };
    });

    res.json({ devices });
  })
);

const updateDeviceSchema = z.object({
  customName: z.string().max(64).nullable().optional(),
  icon: DEVICE_ICON_SCHEMA.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  groupId: z.number().int().nullable().optional(),
});

devicesRoutes.get(
  '/devices/events',
  asyncRoute(async (_req, res) => {
    res.json({ events: listRecentEvents() });
  })
);

devicesRoutes.patch(
  '/devices/:mac',
  asyncRoute(async (req, res) => {
    const updates = updateDeviceSchema.parse(req.body);
    upsertOverlay(req.params.mac, updates);
    res.json({ ok: true });
  })
);

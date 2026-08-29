import { Router } from 'express';
import { routerClient } from '../router-client/instance.js';
import { getUsbStatus } from '../router-client/endpoints/usb.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const usbRoutes = Router();

usbRoutes.get(
  '/usb',
  asyncRoute(async (_req, res) => {
    const status = await getUsbStatus(routerClient);
    res.json({ status });
  })
);

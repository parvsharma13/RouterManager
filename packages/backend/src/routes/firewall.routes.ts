import { Router } from 'express';
import { routerClient } from '../router-client/instance.js';
import { getFirewallRules, getCyberSecureLevel } from '../router-client/endpoints/firewall.js';
import { getParentalControls } from '../router-client/endpoints/parentalControls.js';
import { asyncRoute } from '../middleware/errorHandler.js';

export const firewallRoutes = Router();

firewallRoutes.get(
  '/firewall',
  asyncRoute(async (_req, res) => {
    const [rules, cyberSecure] = await Promise.all([
      getFirewallRules(routerClient),
      getCyberSecureLevel(routerClient),
    ]);
    res.json({ rules, cyberSecure });
  })
);

firewallRoutes.get(
  '/firewall/parental-controls',
  asyncRoute(async (_req, res) => {
    const parentalControls = await getParentalControls(routerClient);
    res.json({ parentalControls });
  })
);

import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { routerClient } from './router-client/instance.js';
import { reconcileAllPolicies } from './services/policyEngine.js';
import { listEnabledPolicies } from './store/policyStore.js';
import './store/db.js';

const app = express();

const allowedOrigins = new Set([
  env.FRONTEND_ORIGIN,
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
]);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(requestLogger);

app.use('/api', apiRouter);

app.use(errorHandler);

app.listen(env.BACKEND_PORT, () => {
  console.log(`RouterManager backend listening on http://localhost:${env.BACKEND_PORT}`);
  console.log(`Proxying to router at ${env.ROUTER_BASE_URL}`);

  // Re-assert any enabled pause/schedule policy against the router on boot, in case it was
  // rebooted/reset since this backend last ran — see policyEngine.ts. Non-fatal: the rest
  // of the app (device/group management, everything not policy-enforcement) works fine
  // even if the router is unreachable right now.
  reconcileAllPolicies(routerClient, listEnabledPolicies()).catch((err) =>
    console.warn('[startup] Policy reconciliation failed (router may be unreachable):', err)
  );

  if (env.POLICY_SYNC_INTERVAL_MS) {
    setInterval(() => {
      reconcileAllPolicies(routerClient, listEnabledPolicies()).catch((err) =>
        console.warn('[policy-sync] Periodic reconciliation failed:', err)
      );
    }, env.POLICY_SYNC_INTERVAL_MS);
  }
});

import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  ROUTER_BASE_URL: z.string().url().default('https://192.168.1.1'),
  ROUTER_ADMIN_USERNAME: z.string().default('admin'),
  ROUTER_ADMIN_PASSWORD: z.string().optional(),
  ROUTER_ALLOW_SELF_SIGNED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  BACKEND_PORT: z
    .string()
    .default('4001')
    .transform((v) => Number(v)),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  // Off by default — the app is on-demand, not a long-running service, and native
  // router-side enforcement (see policyEngine.ts) already persists policies without this.
  // Set this only if you run the backend continuously and want it to periodically re-push
  // policies (e.g. self-heal after a router reboot/reset) without restarting the backend.
  POLICY_SYNC_INTERVAL_MS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
});

export const env = schema.parse(process.env);

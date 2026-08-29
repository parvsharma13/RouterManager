import { loadCredentials } from '../config/credentials.js';
import { RouterClient } from './RouterClient.js';

// Single module-level singleton — this app is single-tenant and local-only, so one
// long-lived authenticated session for the whole process lifetime is all we need.
export const routerConfig = loadCredentials();
export const routerClient = new RouterClient(routerConfig);

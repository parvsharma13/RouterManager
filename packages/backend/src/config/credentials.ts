import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Entry } from '@napi-rs/keyring';
import { env } from './env.js';

const KEYCHAIN_SERVICE = 'RouterManager';
const KEYCHAIN_ACCOUNT = 'router-admin';

const backendRoot = path.resolve(fileURLToPath(import.meta.url), '../../..');
const routerConfigPath = path.join(backendRoot, '.router-config.json');

export interface RouterConfig {
  baseUrl: string;
  username: string;
  password: string;
  allowSelfSigned: boolean;
}

interface StoredNonSecretConfig {
  baseUrl: string;
  username: string;
}

function readNonSecretConfig(): StoredNonSecretConfig | null {
  if (!fs.existsSync(routerConfigPath)) return null;
  return JSON.parse(fs.readFileSync(routerConfigPath, 'utf8'));
}

export function writeNonSecretConfig(config: StoredNonSecretConfig): void {
  fs.writeFileSync(routerConfigPath, JSON.stringify(config, null, 2));
}

export function setStoredPassword(password: string): void {
  new Entry(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).setPassword(password);
}

function readKeychainPassword(): string | null {
  try {
    return new Entry(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).getPassword();
  } catch {
    return null; // not found, or keychain unavailable — caller falls back
  }
}

export function loadCredentials(): RouterConfig {
  const stored = readNonSecretConfig();
  const baseUrl = stored?.baseUrl ?? env.ROUTER_BASE_URL;
  const username = stored?.username ?? env.ROUTER_ADMIN_USERNAME;

  let password = readKeychainPassword();
  let source = 'macOS Keychain';

  if (!password && env.ROUTER_ADMIN_PASSWORD) {
    password = env.ROUTER_ADMIN_PASSWORD;
    source = '.env (ROUTER_ADMIN_PASSWORD)';
    console.warn(
      '[credentials] Using ROUTER_ADMIN_PASSWORD from .env. Prefer `npm run setup:credentials` ' +
        'to store it in macOS Keychain instead of a plaintext file.'
    );
  }

  if (!password) {
    throw new Error(
      'No router admin password found in Keychain or .env. Run `npm run setup:credentials` first.'
    );
  }

  console.log(`[credentials] Loaded router credentials (password source: ${source})`);
  return { baseUrl, username, password, allowSelfSigned: env.ROUTER_ALLOW_SELF_SIGNED };
}

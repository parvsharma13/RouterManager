import type { DdnsConfig } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=dns — DDNS is a sub-section of this OID (ddnsUsername/ddnsPassword field names seen
// referenced in the app bundle). Confirmed reachable but empty on the live device (DDNS not
// configured) — exact nesting under Object[0] not yet confirmed against a populated entry.
interface DnsDalEntry {
  ddnsEnable?: boolean;
  ddnsProvider?: string;
  ddnsHostname?: string;
  ddnsUsername?: string;
}
interface DnsDal {
  Object: DnsDalEntry[];
}

export async function getDdnsConfig(client: RouterClient): Promise<DdnsConfig> {
  const data = await client.daoGet<DnsDal>('dns');
  const entry = data.Object[0] ?? {};
  return {
    enable: entry.ddnsEnable ?? false,
    provider: entry.ddnsProvider ?? '',
    hostname: entry.ddnsHostname ?? '',
    username: entry.ddnsUsername ?? '',
  };
}

export interface DdnsUpdate {
  enable: boolean;
  provider: string;
  hostname: string;
  username: string;
  password: string;
}

// Not yet confirmed live — verify field names against the stock GUI (Phase 4 in the plan)
// before trusting this to actually change anything.
export async function updateDdnsConfig(client: RouterClient, update: DdnsUpdate): Promise<void> {
  await client.daoSet(
    'dns',
    {
      ddnsEnable: update.enable,
      ddnsProvider: update.provider,
      ddnsHostname: update.hostname,
      ddnsUsername: update.username,
      ddnsPassword: update.password,
    },
    'PUT'
  );
}

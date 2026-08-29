import type { WlanBand } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=wlan — see docs/api-notes.md. One element per band/SSID.
interface WlanDalEntry {
  Index: number;
  SSID: string;
  band: string;
  wlEnable: boolean;
  wlHide: boolean;
  MainSSID: boolean;
  channel: number;
  bandwidth: string;
  SecurityMode: string;
  PskDisplay: string;
}
interface WlanDal {
  Object: WlanDalEntry[];
}

export async function getWlanBands(client: RouterClient): Promise<WlanBand[]> {
  const data = await client.daoGet<WlanDal>('wlan');
  return data.Object.map((entry) => ({
    index: entry.Index,
    ssid: entry.SSID,
    band: entry.band,
    enabled: entry.wlEnable,
    hidden: entry.wlHide,
    mainSsid: entry.MainSSID,
    channel: entry.channel,
    bandwidth: entry.bandwidth,
    securityMode: entry.SecurityMode,
    pskDisplay: entry.PskDisplay,
  }));
}

export interface WlanUpdate {
  index: number;
  ssid?: string;
  psk?: string;
  enabled?: boolean;
  hidden?: boolean;
}

// Write shape not yet confirmed live (see docs/api-notes.md) — this mirrors the GET field
// names as a best-effort first attempt. Verify against the stock GUI before trusting it,
// per the plan's Phase 3 verification approach, and adjust field names here if the router
// rejects it or the change doesn't take.
export async function updateWlanBand(client: RouterClient, update: WlanUpdate): Promise<void> {
  const payload: Record<string, unknown> = { Index: update.index };
  if (update.ssid !== undefined) payload.SSID = update.ssid;
  if (update.psk !== undefined) payload.PskDisplay = update.psk;
  if (update.enabled !== undefined) payload.wlEnable = update.enabled;
  if (update.hidden !== undefined) payload.wlHide = update.hidden;
  await client.daoSet('wlan', payload, 'PUT');
}

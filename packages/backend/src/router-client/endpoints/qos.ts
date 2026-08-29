import type { QosSettings } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=qos: see docs/api-notes.md, shape confirmed live.
interface QosDalEntry {
  Enable: boolean;
  UpRate: number;
  DownRate: number;
  MinUpRate: number;
  MaxUpRate: number;
}
interface QosDal {
  Object: QosDalEntry[];
}

export async function getQosSettings(client: RouterClient): Promise<QosSettings> {
  const data = await client.daoGet<QosDal>('qos');
  const entry = data.Object[0];
  if (!entry) throw new Error('qos oid returned no entry; router response shape may have changed');
  return {
    enable: entry.Enable,
    upRate: entry.UpRate,
    downRate: entry.DownRate,
    minUpRate: entry.MinUpRate,
    maxUpRate: entry.MaxUpRate,
  };
}

export async function updateQosSettings(client: RouterClient, settings: Partial<QosSettings>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (settings.enable !== undefined) payload.Enable = settings.enable;
  if (settings.upRate !== undefined) payload.UpRate = settings.upRate;
  if (settings.downRate !== undefined) payload.DownRate = settings.downRate;
  await client.daoSet('qos', payload, 'PUT'); // not yet confirmed live: verify against stock GUI first
}

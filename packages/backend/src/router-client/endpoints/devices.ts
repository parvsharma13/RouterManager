import type { DeviceEntry } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=lanhosts: see docs/api-notes.md.
interface LanHostsDal {
  Object: Array<{
    wanInfo?: unknown;
    lanhosts: Array<{
      HostName: string;
      IPAddress: string;
      PhysAddress: string;
      Active: boolean;
      InterfaceType: string;
      X_ZYXEL_ConnectionType: string;
      X_ZYXEL_SignalStrength?: number;
    }>;
  }>;
}

export async function getDevices(client: RouterClient): Promise<DeviceEntry[]> {
  const data = await client.daoGet<LanHostsDal>('lanhosts');
  const hosts = data.Object[0]?.lanhosts ?? [];
  return hosts.map((h) => ({
    hostName: h.HostName || '(unknown)',
    ipAddress: h.IPAddress,
    macAddress: h.PhysAddress,
    active: h.Active,
    interfaceType: h.InterfaceType,
    connectionType: h.X_ZYXEL_ConnectionType,
    signalStrength: h.X_ZYXEL_SignalStrength ?? null,
  }));
}

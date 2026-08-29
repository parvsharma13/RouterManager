import type { RouterClient } from '../RouterClient.js';

// oid=wan: see docs/api-notes.md. ✓ shape seen: Type, Mode, IPAddress, GatewayIPAddress,
// DNSServer, VLANID, NatEnable, ... `connected` isn't a field the router sends directly;
// inferred from IPAddress being non-empty, same "derive a boolean from field presence"
// convention already used for UsbDeviceStatus.connected.
interface WanDalEntry {
  Type: string;
  IPAddress: string;
  [key: string]: unknown;
}
interface WanDal {
  Object: WanDalEntry[];
}

export interface WanStatus {
  connected: boolean;
  type: string;
  ipAddress: string;
  dnsServer: string;
}

export async function getWanStatus(client: RouterClient): Promise<WanStatus> {
  const data = await client.daoGet<WanDal>('wan');
  const entry = data.Object[0];
  if (!entry) throw new Error('wan oid returned no entries; router response shape may have changed');
  const dns = entry.DNSServer;
  return {
    connected: Boolean(entry.IPAddress),
    type: entry.Type ?? '',
    ipAddress: entry.IPAddress ?? '',
    dnsServer: Array.isArray(dns) ? dns.join(', ') : String(dns ?? ''),
  };
}

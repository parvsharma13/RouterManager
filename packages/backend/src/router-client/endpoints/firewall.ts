import type { FirewallRule } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=firewall_acl (rule list, empty on the live device) and oid=cyber_secure (a security
// level/preset toggle — shape unconfirmed, see docs/api-notes.md). Kept as thin passthrough
// since we haven't confirmed exact field names against a populated example yet.
interface FirewallAclDal {
  Object: Array<Record<string, unknown>>;
}

export async function getFirewallRules(client: RouterClient): Promise<FirewallRule[]> {
  const data = await client.daoGet<FirewallAclDal>('firewall_acl');
  return data.Object.map((r, i) => ({
    index: typeof r.Index === 'number' ? r.Index : i,
    enable: Boolean(r.Enable),
    name: typeof r.Name === 'string' ? r.Name : `Rule ${i + 1}`,
    action: typeof r.Action === 'string' ? r.Action : '',
    ...r,
  }));
}

export async function getCyberSecureLevel(client: RouterClient): Promise<Record<string, unknown>> {
  const data = await client.daoGet<{ Object: Array<Record<string, unknown>> }>('cyber_secure');
  return data.Object[0] ?? {};
}

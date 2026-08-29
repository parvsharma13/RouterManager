import type { PortForwardRule } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=nat — see docs/api-notes.md. Currently confirmed reachable but empty on the live
// device (no rules configured), so field names below are inferred from the app bundle's
// form-field naming conventions, not yet confirmed against a populated real entry.
// Verify field names the first time a rule is actually added (Phase 4 in the plan).
interface NatDalEntry {
  Index: number;
  Enable: boolean;
  Name: string;
  Protocol: string;
  ExternalPort: string;
  InternalClient: string;
  InternalPort: string;
}
interface NatDal {
  Object: NatDalEntry[];
}

export async function getPortForwardingRules(client: RouterClient): Promise<PortForwardRule[]> {
  const data = await client.daoGet<NatDal>('nat');
  return data.Object.map((r) => ({
    index: r.Index,
    enable: r.Enable,
    name: r.Name,
    protocol: r.Protocol,
    externalPort: r.ExternalPort,
    internalIp: r.InternalClient,
    internalPort: r.InternalPort,
  }));
}

export interface PortForwardRuleInput {
  name: string;
  protocol: string;
  externalPort: string;
  internalIp: string;
  internalPort: string;
  enable: boolean;
}

// Not yet confirmed live — see the note above. Test against the stock GUI before relying on this.
export async function addPortForwardingRule(client: RouterClient, rule: PortForwardRuleInput): Promise<void> {
  await client.daoSet(
    'nat',
    {
      Enable: rule.enable,
      Name: rule.name,
      Protocol: rule.protocol,
      ExternalPort: rule.externalPort,
      InternalClient: rule.internalIp,
      InternalPort: rule.internalPort,
    },
    'POST'
  );
}

export async function deletePortForwardingRule(client: RouterClient, index: number): Promise<void> {
  await client.daoSet('nat', { Index: index }, 'PUT'); // DELETE-shaped write, not yet confirmed live
}

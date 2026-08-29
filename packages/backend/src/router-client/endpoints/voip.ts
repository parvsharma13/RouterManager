import type { VoipLineStatus } from '@router-manager/shared';
import type { RouterClient } from '../RouterClient.js';

// oid=sip_account: see docs/api-notes.md, shape confirmed live (2 entries, matching the
// router's 2 FXS ports). Read-only by design: this is almost certainly provisioned by the
// ISP (Hyperoptic) and shouldn't be editable from this app; see the note in api-notes.md.
interface SipAccountDalEntry {
  Index: number;
  DirectoryNumber: string;
  Enable: boolean;
  Status: string;
  AuthUserName: string;
}
interface SipAccountDal {
  Object: SipAccountDalEntry[];
}

export async function getVoipLines(client: RouterClient): Promise<VoipLineStatus[]> {
  const data = await client.daoGet<SipAccountDal>('sip_account');
  return data.Object.map((e) => ({
    index: e.Index,
    directoryNumber: e.DirectoryNumber,
    enable: e.Enable,
    status: e.Status,
    authUserName: e.AuthUserName,
  }));
}

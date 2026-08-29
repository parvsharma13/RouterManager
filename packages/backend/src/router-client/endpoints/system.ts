import type { RouterClient } from '../RouterClient.js';

// oid=user_account — see docs/api-notes.md, shape confirmed live. No password field in the
// GET response (write-only, by design on the router's side).
interface UserAccountDalEntry {
  Username: string;
  Enabled: boolean;
  RemoteAccessPrivilege: boolean;
  AccountIdleTime: number;
}
interface UserAccountDal {
  Object: UserAccountDalEntry[];
}

export async function getAdminAccountInfo(client: RouterClient): Promise<UserAccountDalEntry | null> {
  const data = await client.daoGet<UserAccountDal>('user_account');
  return data.Object[0] ?? null;
}

// oid=tr69 — Hyperoptic's remote-management (ACS) config. Deliberately READ-ONLY: display
// it on the System page for visibility, but this app must never write to this oid — see
// docs/api-notes.md for why (could break ISP support access, or vice versa).
interface Tr69DalEntry {
  EnableCWMP: boolean;
  URL: string;
  Username: string;
  PeriodicInformEnable: boolean;
  PeriodicInformInterval: number;
}
interface Tr69Dal {
  Object: Tr69DalEntry[];
}

export async function getRemoteManagementInfo(client: RouterClient): Promise<Tr69DalEntry | null> {
  const data = await client.daoGet<Tr69Dal>('tr69');
  return data.Object[0] ?? null;
}

// /cgi-bin/Reboot — literal cgi-bin route seen in the app bundle, not a DAL oid.
// Exact body (if any) not yet confirmed live — verify once, from the app's own System page,
// before wiring a "Reboot" button up to this without a confirmation dialog in the UI.
export async function rebootRouter(client: RouterClient): Promise<void> {
  await client.cgiCall('Reboot');
}

// /cgi-bin/PasswordReset — literal cgi-bin route seen in the app bundle. Field names below
// are a best guess pending live confirmation (Phase 5 in the plan — do this LAST and with
// extra care, since a wrong guess here could lock you out of both the app and the router GUI).
export async function changeAdminPassword(client: RouterClient, oldPassword: string, newPassword: string): Promise<void> {
  await client.cgiCall('PasswordReset', {
    Input_CurPassword: Buffer.from(oldPassword, 'utf8').toString('base64'),
    Input_NewPassword: Buffer.from(newPassword, 'utf8').toString('base64'),
  });
}

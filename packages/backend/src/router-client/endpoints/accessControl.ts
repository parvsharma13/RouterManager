import type { RouterClient } from '../RouterClient.js';
import { RouterUnsupportedFeatureError } from '../errors.js';

// oid=wlan_sch_access / oid=scheduler: see docs/api-notes.md. Listed as siblings of
// paren_ctl ("time-based access schedules") and confirmed *reachable*, but (unlike every
// other write in this codebase) their GET shape has never been inspected by decompiling
// the router's own web app bundle (the usual, reliable way every other OID's write shape
// in this project was pinned down). So unlike wlan.ts/ddns.ts/qos.ts, which mirror *known*
// GET field names into their write payload, the payload below is a genuine best-effort
// guess from DAL naming conventions seen elsewhere on this router (Index-addressed arrays,
// `Enable` booleans, MAC-keyed entries). Expect it to be wrong on the first live attempt.
// That's fine by design: callers must treat a thrown RouterUnsupportedFeatureError here as
// "this guess needs correcting", not "the feature doesn't exist"; see policyEngine.ts,
// which falls back to enforcement:'unenforced' rather than surfacing a hard error.
//
// Live probe against a real EX3301-T0 (2026-08-25, firmware V5.50(ABVY.5.5)b6_Y0): both
// OIDs come back `result: ZCFG_SUCCESS, Object: []`: reachable, but no entries configured
// yet, so no field names were revealed (the same place nat/dns/firewall_acl were before
// those got configured). Two possibly-meaningful hints from the response envelope, though:
// `scheduler`'s `ReplyMsg` was `"Type"` and `paren_ctl`'s was `"Id"` (normally empty on a
// clean read, e.g. wlan/lanhosts return `""`). Plausibly naming a field the request is
// missing, but that's speculation, not confirmed.
//
// Also tried live: a PUT with the guessed payload below returned ZCFG_SUCCESS but a re-GET
// still showed `Object: []` (nothing actually created); switching to POST (this project's
// "add a new entry" convention, see addPortForwardingRule) got the same ZCFG_SUCCESS-but-
// nothing-persisted result. That's exactly why this function verifies by re-reading rather
// than trusting the write response. Don't remove that check even after the payload below
// gets corrected, it's cheap insurance against the same false-positive happening again.
// Next step for whoever has live access: GET `/api/policies/raw`, try the `Type`/`Id` hints
// above as extra payload fields, and/or decompile the router's web app bundle the way every
// other OID in this project was actually pinned down (this environment doesn't have that,
// working from naming-convention guesses only).

interface RawDal {
  Object: unknown[];
}

export async function getAccessControlRaw(
  client: RouterClient
): Promise<{ wlanSchAccess: unknown; scheduler: unknown; parentalControl: unknown }> {
  const [wlanSchAccess, scheduler, parentalControl] = await Promise.all([
    client.daoGet<RawDal>('wlan_sch_access').catch((err) => describeFailure(err)),
    client.daoGet<RawDal>('scheduler').catch((err) => describeFailure(err)),
    client.daoGet<RawDal>('paren_ctl').catch((err) => describeFailure(err)),
  ]);
  return { wlanSchAccess, scheduler, parentalControl };
}

function describeFailure(err: unknown): { unsupported: boolean; error: string } {
  return {
    unsupported: err instanceof RouterUnsupportedFeatureError,
    error: err instanceof Error ? err.message : String(err),
  };
}

export interface NativeSchedulePayload {
  macAddress: string;
  days: number[]; // 0=Sunday..6=Saturday
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  enabled: boolean;
}

// Best-effort write: see file-level comment. `daoSet` resolving without throwing only
// means the router answered `ZCFG_SUCCESS` at the HTTP/DAL level; live testing (2026-08-25)
// showed that's *not* sufficient proof the write actually did anything: a PUT against this
// OID while it held zero entries returned ZCFG_SUCCESS but created nothing (GETting it back
// still showed `Object: []`). POST (this project's "add a new entry" convention elsewhere,
// e.g. portForwarding.ts's addPortForwardingRule) is tried instead, and (since neither verb
// nor field names are confirmed) success is only reported once a re-GET shows the entry
// actually landed. Treat a RouterUnsupportedFeatureError the same as "verification failed":
// the guessed shape needs correcting, not proof the router lacks the feature (already probed
// reachable in capabilities/detect.ts before this is ever called).
export async function pushNativeSchedule(client: RouterClient, payload: NativeSchedulePayload): Promise<boolean> {
  try {
    await client.daoSet(
      'wlan_sch_access',
      {
        MACAddress: payload.macAddress,
        Enable: payload.enabled,
        DayOfWeek: payload.days,
        StartTime: payload.startTime,
        EndTime: payload.endTime,
      },
      'POST'
    );
    const after = await client.daoGet<RawDal>('wlan_sch_access');
    return after.Object.length > 0 && JSON.stringify(after.Object).includes(payload.macAddress);
  } catch (err) {
    if (err instanceof RouterUnsupportedFeatureError) return false;
    throw err;
  }
}

// A "pause" is modeled as an always-on block: a schedule covering every day, 00:00-23:59.
export async function pushNativePause(client: RouterClient, macAddress: string, enabled: boolean): Promise<boolean> {
  return pushNativeSchedule(client, {
    macAddress,
    days: [0, 1, 2, 3, 4, 5, 6],
    startTime: '00:00',
    endTime: '23:59',
    enabled,
  });
}

// Best-effort removal of any native schedule for a MAC (e.g. when a policy is deleted
// app-side). Same caveats as above.
export async function clearNativeSchedule(client: RouterClient, macAddress: string): Promise<boolean> {
  return pushNativeSchedule(client, { macAddress, days: [], startTime: '00:00', endTime: '00:00', enabled: false });
}

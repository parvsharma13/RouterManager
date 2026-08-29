import type { Policy } from '@router-manager/shared';
import type { RouterClient } from '../router-client/RouterClient.js';
import { pushNativePause, pushNativeSchedule, clearNativeSchedule } from '../router-client/endpoints/accessControl.js';
import { listDeviceMacsInGroup } from '../store/deviceStore.js';
import { setEnforcement } from '../store/policyStore.js';

// Translates an app-level Policy into the router's native access-control OIDs so pause/
// schedule persist independent of this backend's uptime (see the plan's "on-demand" design
// goal — we push the enforcement to the router instead of running a background loop that
// polls and blocks). Falls back to enforcement:'unenforced' — tracked locally, surfaced
// plainly in the UI, not silently pretending to work — when the router rejects the write,
// which given accessControl.ts's unconfirmed payload shape is an expected possibility.

function resolveTargetMacs(policy: Policy): string[] {
  if (policy.targetType === 'device') return [policy.targetId];
  return listDeviceMacsInGroup(Number(policy.targetId));
}

export async function applyPolicy(client: RouterClient, policy: Policy): Promise<'native' | 'unenforced'> {
  const macs = resolveTargetMacs(policy);
  if (macs.length === 0) {
    setEnforcement(policy.id, 'unenforced');
    return 'unenforced';
  }

  const results = await Promise.all(
    macs.map((mac) => {
      if (!policy.enabled) return clearNativeSchedule(client, mac);
      if (policy.type === 'pause') return pushNativePause(client, mac, true);
      return pushNativeSchedule(client, {
        macAddress: mac,
        days: policy.days,
        startTime: policy.startTime,
        endTime: policy.endTime,
        enabled: true,
      });
    })
  );

  const enforcement = results.every(Boolean) ? 'native' : 'unenforced';
  setEnforcement(policy.id, enforcement);
  return enforcement;
}

export async function removePolicyEnforcement(client: RouterClient, policy: Policy): Promise<void> {
  const macs = resolveTargetMacs(policy);
  // Best-effort cleanup — a policy that was never successfully pushed natively has nothing
  // to clear, and a failure here shouldn't block deleting the policy app-side.
  await Promise.allSettled(macs.map((mac) => clearNativeSchedule(client, mac)));
}

// Re-push every currently-enabled policy. Call once on backend startup so a restart (the
// backend isn't required to run continuously — see the plan) re-asserts anything that
// should be active, in case the router itself was rebooted/reset in the meantime.
export async function reconcileAllPolicies(client: RouterClient, policies: Policy[]): Promise<void> {
  for (const policy of policies.filter((p) => p.enabled)) {
    try {
      await applyPolicy(client, policy);
    } catch (err) {
      console.warn(`[policyEngine] Failed to reconcile policy ${policy.id} on boot:`, err);
    }
  }
}

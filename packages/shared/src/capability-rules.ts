import type { FeatureWriteStatus, RouterSupportLevel } from './types/router.js';

// Single source of truth for which router-facing features this app knows about, what
// counts as a supported model, and which OID writes are enabled at which support tier.
// Both the Express backend (packages/backend/src/capabilities/detect.ts) and the native
// standalone Android path (packages/frontend/src/lib/direct-api.ts) probe the same router
// protocol, so they classify capabilities from this one table instead of two copies that
// can silently drift apart.
export const OID_LABELS: Record<string, string> = {
  status: 'Router status',
  wan: 'Internet connection',
  wlan: 'Wi-Fi',
  lanhosts: 'Connected devices',
  nat: 'Port forwarding',
  dns: 'DNS and DDNS',
  firewall_acl: 'Firewall',
  cyber_secure: 'Security preset',
  paren_ctl: 'Parental controls',
  qos: 'Quality of service',
  sip_account: 'Hyperoptic phone',
  usb_info: 'USB',
  user_account: 'Administrator account',
  tr69: 'Hyperoptic remote management',
  wlan_sch_access: 'Access schedules',
  scheduler: 'Scheduler',
};

export const PROBED_OIDS = Object.keys(OID_LABELS);

// OIDs this app only ever reads, never routes a write through them, on any router.
const READ_ONLY_OIDS = new Set([
  'status', 'wan', 'lanhosts', 'firewall_acl', 'cyber_secure', 'sip_account', 'usb_info', 'tr69',
]);

export function classifyRouterSupport(modelName: string): RouterSupportLevel {
  const normalized = modelName.toUpperCase();
  if (normalized.includes('EX3301')) return 'verified';
  if (normalized.includes('EX3501') || normalized.includes('EX3500')) return 'experimental';
  return 'unsupported';
}

export function compatibilityMessage(level: RouterSupportLevel): string {
  if (level === 'verified') return 'Verified Hyperoptic Zyxel EX3301 support.';
  if (level === 'experimental') return 'This Zyxel model is unverified. Router settings are read-only.';
  return 'This router model is not supported; settings are read-only.';
}

// The write ceiling this app offers for a given OID at a given router support tier. Only
// Wi-Fi writes have been confirmed live against real hardware; every other write stays
// blocked until it is verified the same way, whatever the model classifies as.
export function writeStatusFor(oid: string, level: RouterSupportLevel): FeatureWriteStatus {
  if (READ_ONLY_OIDS.has(oid)) return 'not-applicable';
  if (level !== 'verified') return 'blocked';
  return oid === 'wlan' ? 'verified' : 'blocked';
}

export function writeReasonFor(write: FeatureWriteStatus): string {
  if (write === 'verified') return 'Write operation verified on the supported EX3301 firmware.';
  if (write === 'not-applicable') return 'This feature is informational.';
  return 'Read access is available, but changes are disabled until this firmware is verified.';
}

export const UNAVAILABLE_REASON = 'The connected router did not expose this feature.';

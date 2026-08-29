// Field names mirror the router's own OID field names (see docs/api-notes.md) so that
// mapping a DAL response onto these types stays a straight passthrough, not a translation layer.

export interface SystemInfo {
  manufacturer: string;
  modelName: string;
  description: string;
  serialNumber: string;
  softwareVersion: string;
  hardwareVersion: string;
  upTimeSeconds: number;
}

export interface WlanBand {
  index: number;
  ssid: string;
  band: '2.4GHz' | '5GHz' | string;
  enabled: boolean;
  hidden: boolean;
  mainSsid: boolean;
  channel: number;
  bandwidth: string;
  securityMode: string;
  pskDisplay: string;
}

export interface DeviceEntry {
  hostName: string;
  ipAddress: string;
  macAddress: string;
  active: boolean;
  interfaceType: string; // "Wi-Fi" | "Ethernet" etc, as reported by the router
  connectionType: string; // e.g. "Wi-Fi 5GHz"
  signalStrength: number | null;
}

export interface PortForwardRule {
  index: number;
  enable: boolean;
  name: string;
  protocol: string;
  externalPort: string;
  internalIp: string;
  internalPort: string;
}

export interface DdnsConfig {
  enable: boolean;
  provider: string;
  hostname: string;
  username: string;
  // password intentionally omitted from the read type (write-only field)
}

export interface FirewallRule {
  index: number;
  enable: boolean;
  name: string;
  action: string;
  [key: string]: unknown; // shape not yet fully confirmed live, see docs/api-notes.md
}

export interface QosSettings {
  enable: boolean;
  upRate: number;
  downRate: number;
  minUpRate: number;
  maxUpRate: number;
}

export interface VoipLineStatus {
  index: number;
  directoryNumber: string;
  enable: boolean;
  status: string;
  authUserName: string;
}

export interface UsbDeviceStatus {
  connected: boolean;
  raw: unknown; // shape not yet fully confirmed live, see docs/api-notes.md
}

export type CapabilityStatus = 'supported' | 'unsupported' | 'unknown';

export type FeatureReadStatus = 'available' | 'unavailable' | 'unknown';
export type FeatureWriteStatus = 'verified' | 'experimental' | 'blocked' | 'not-applicable';

export interface FeatureCapability {
  key: string;
  label: string;
  read: FeatureReadStatus;
  write: FeatureWriteStatus;
  reason: string;
  source: 'live-probe' | 'firmware-allowlist' | 'cached-probe';
  lastVerifiedFirmware: string | null;
}

export type RouterSupportLevel = 'verified' | 'experimental' | 'unsupported';

export interface RouterCompatibility {
  manufacturer: string;
  model: string;
  firmware: string;
  supportLevel: RouterSupportLevel;
  detectedAt: string;
  message: string;
}

export interface DiagnosticCheck {
  key: 'router' | 'wan' | 'dns';
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}

export interface DiagnosticsResult {
  checkedAt: string;
  routerLatencyMs: number | null;
  wanConnected: boolean;
  checks: DiagnosticCheck[];
}

export interface CapabilityMap {
  [oid: string]: CapabilityStatus | FeatureCapability;
}

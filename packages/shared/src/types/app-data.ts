// App-owned data: the router has no concept of "groups" or "policies"; everything in
// this file is stored and enforced by this app, not the router's own DAL/OID system.
// See docs/api-notes.md's paren_ctl/wlan_sch_access/scheduler entries for the native
// enforcement path a Policy tries to use before falling back to "unenforced".

export type DeviceIcon =
  | 'phone'
  | 'laptop'
  | 'desktop'
  | 'tablet'
  | 'tv'
  | 'speaker'
  | 'console'
  | 'camera'
  | 'iot'
  | 'other';

// Local per-device overlay, keyed by MAC, merged onto the router's live lanhosts data.
export interface DeviceOverlay {
  macAddress: string;
  customName: string | null;
  icon: DeviceIcon | null;
  notes: string | null;
  groupId: number | null;
}

// The merged view the frontend actually renders: router-reported live fields + our overlay.
export interface ManagedDevice {
  macAddress: string;
  hostName: string;
  customName: string | null;
  displayName: string;
  ipAddress: string;
  active: boolean;
  interfaceType: string;
  connectionType: string;
  signalStrength: number | null;
  icon: DeviceIcon | null;
  notes: string | null;
  groupId: number | null;
  isNew: boolean;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface DeviceGroup {
  id: number;
  name: string;
  icon: DeviceIcon | null;
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PolicyTargetType = 'device' | 'group';

interface PolicyBase {
  id: number;
  targetType: PolicyTargetType;
  targetId: string; // MAC address for 'device', group id (stringified) for 'group'
  enabled: boolean;
  // Whether the last write to the router's own schedule/parental-control OID succeeded.
  // 'unenforced' means this policy is only tracked locally and isn't actually blocking
  // anything on the network yet; the UI should say so plainly rather than imply it works.
  enforcement: 'native' | 'unenforced';
  createdAt: string;
  updatedAt: string;
}

export type Policy =
  | (PolicyBase & { type: 'pause' })
  | (PolicyBase & { type: 'schedule'; days: number[]; startTime: string; endTime: string });

export interface DeviceEvent {
  id: number;
  macAddress: string | null;
  displayName: string;
  eventType:
    | 'new_device'
    | 'device_offline'
    | 'device_online'
    | 'router_online'
    | 'router_offline'
    | 'settings_changed'
    | 'reboot_requested'
    | 'certificate_changed'
    | 'diagnostic_result';
  occurredAt: string;
  detail?: string | null;
}

export interface NotificationPreferences {
  newDevices: boolean;
  routerOffline: boolean;
  backgroundChecks: boolean;
  intervalMinutes: 15 | 30 | 60;
}

export interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number | null;
  pingMs: number | null;
  measuredAt: string;
  source: 'router-native' | 'backend';
}

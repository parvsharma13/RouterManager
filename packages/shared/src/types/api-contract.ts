import type {
  SystemInfo,
  WlanBand,
  DeviceEntry,
  PortForwardRule,
  DdnsConfig,
  QosSettings,
  VoipLineStatus,
  UsbDeviceStatus,
  CapabilityMap,
  RouterCompatibility,
  DiagnosticsResult,
} from './router.js';
import type { DeviceIcon, ManagedDevice, DeviceGroup, Policy, DeviceEvent, NotificationPreferences, SpeedTestResult } from './app-data.js';

export interface ApiError {
  code:
    | 'UNAUTHORIZED'
    | 'RATE_LIMITED'
    | 'ROUTER_UNREACHABLE'
    | 'ROUTER_AUTH_FAILED'
    | 'FEATURE_UNSUPPORTED'
    | 'INVALID_INPUT'
    | 'INTERNAL_ERROR';
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: { username: string };
}

export interface CapabilitiesResponse {
  capabilities: CapabilityMap;
  compatibility?: RouterCompatibility;
}

export interface DiagnosticsResponse {
  result: DiagnosticsResult;
}

export interface DashboardResponse {
  system: SystemInfo;
  wan: {
    connected: boolean;
    type: string;
    ipAddress: string;
  };
}

export interface WifiResponse {
  bands: WlanBand[];
}

export interface WifiUpdateRequest {
  index: number;
  ssid?: string;
  psk?: string;
  enabled?: boolean;
  hidden?: boolean;
}

export interface DevicesResponse {
  devices: DeviceEntry[];
}

export interface PortForwardingResponse {
  rules: PortForwardRule[];
}

export interface DdnsResponse {
  config: DdnsConfig;
}

export interface QosResponse {
  settings: QosSettings;
}

export interface VoipResponse {
  lines: VoipLineStatus[];
}

export interface UsbResponse {
  status: UsbDeviceStatus;
}

// --- Device management (app-owned overlay on top of the router's live lanhosts) ---

export interface ManagedDevicesResponse {
  devices: ManagedDevice[];
}

export interface UpdateDeviceRequest {
  customName?: string | null;
  icon?: DeviceIcon | null;
  notes?: string | null;
  groupId?: number | null;
}

// --- Groups (eero-style "Profiles") ---

export interface DeviceGroupsResponse {
  groups: DeviceGroup[];
}

export interface DeviceGroupResponse {
  group: DeviceGroup;
}

export interface CreateGroupRequest {
  name: string;
  icon?: DeviceIcon | null;
}

export interface UpdateGroupRequest {
  name?: string;
  icon?: DeviceIcon | null;
}

// --- Policies (pause / schedule, attached to a device or a group) ---

export interface PoliciesResponse {
  policies: Policy[];
}

export interface PolicyResponse {
  policy: Policy;
}

export type CreatePolicyRequest =
  | { targetType: 'device' | 'group'; targetId: string; type: 'pause'; enabled?: boolean }
  | {
      targetType: 'device' | 'group';
      targetId: string;
      type: 'schedule';
      days: number[];
      startTime: string;
      endTime: string;
      enabled?: boolean;
    };

export interface UpdatePolicyRequest {
  enabled?: boolean;
  days?: number[];
  startTime?: string;
  endTime?: string;
}

// --- New-device alerts & join history ---

export interface DeviceEventsResponse {
  events: DeviceEvent[];
}

// --- Speed test ---

export interface SpeedTestResponse {
  result: SpeedTestResult;
}

// --- Notification preferences (device-local; native Android schedules the checks) ---

export interface NotificationsResponse {
  preferences: NotificationPreferences;
}

export type UpdateNotificationsRequest = Partial<NotificationPreferences>;

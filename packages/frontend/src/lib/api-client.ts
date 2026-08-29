import type {
  ApiError,
  CapabilitiesResponse,
  DashboardResponse,
  WifiResponse,
  WifiUpdateRequest,
  ManagedDevicesResponse,
  UpdateDeviceRequest,
  DeviceEventsResponse,
  DeviceGroupsResponse,
  DeviceGroupResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  PoliciesResponse,
  PolicyResponse,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  SpeedTestResponse,
  NotificationsResponse,
  UpdateNotificationsRequest,
  LoginRequest,
  LoginResponse,
} from '@router-manager/shared';
import { Capacitor } from '@capacitor/core';
import { directApi } from './direct-api';

// The frontend only ever calls /api/* (proxied to the backend by Vite in dev) — it has
// zero knowledge of the router's own address. See docs/api-notes.md and the plan's
// "browser never talks to the router directly" boundary.
export class ApiRequestError extends Error {
  apiError: ApiError;
  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.apiError = apiError;
  }
}

let apiOrigin = '';
let accessToken = '';

export function configureApi(origin: string, token = ''): void {
  apiOrigin = origin.replace(/\/$/, '');
  accessToken = token;
}

export function getApiOrigin(): string {
  return apiOrigin;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiOrigin}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ code: 'INTERNAL_ERROR', message: res.statusText }))) as ApiError;
    if (res.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event('router-manager:unauthorized'));
    }
    throw new ApiRequestError(body);
  }
  return res.json() as Promise<T>;
}

const serverApi = {
  health: () => request<{ ok: boolean }>('/health'),
  auth: {
    login: (input: LoginRequest) =>
      request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  },
  capabilities: () => request<CapabilitiesResponse>('/capabilities'),
  dashboard: () => request<DashboardResponse>('/dashboard'),
  wifi: {
    get: () => request<WifiResponse>('/wlan'),
    update: (update: WifiUpdateRequest) =>
      request<{ ok: true }>('/wlan', { method: 'PUT', body: JSON.stringify(update) }),
  },
  devices: {
    list: () => request<ManagedDevicesResponse>('/devices'),
    update: (mac: string, update: UpdateDeviceRequest) =>
      request<{ ok: true }>(`/devices/${encodeURIComponent(mac)}`, { method: 'PATCH', body: JSON.stringify(update) }),
    events: () => request<DeviceEventsResponse>('/devices/events'),
  },
  groups: {
    list: () => request<DeviceGroupsResponse>('/groups'),
    create: (input: CreateGroupRequest) =>
      request<DeviceGroupResponse>('/groups', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: number, input: UpdateGroupRequest) =>
      request<DeviceGroupResponse>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: number) => request<{ ok: true }>(`/groups/${id}`, { method: 'DELETE' }),
  },
  policies: {
    list: () => request<PoliciesResponse>('/policies'),
    raw: () => request<{ wlanSchAccess: unknown; scheduler: unknown; parentalControl: unknown }>('/policies/raw'),
    create: (input: CreatePolicyRequest) =>
      request<PolicyResponse>('/policies', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: number, input: UpdatePolicyRequest) =>
      request<PolicyResponse>(`/policies/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: number) => request<{ ok: true }>(`/policies/${id}`, { method: 'DELETE' }),
  },
  speedTest: {
    run: () => request<SpeedTestResponse>('/speedtest', { method: 'POST' }),
  },
  diagnostics: {
    run: () => request<import('@router-manager/shared').DiagnosticsResponse>('/diagnostics', { method: 'POST' }),
  },
  notifications: {
    get: () => request<NotificationsResponse>('/notifications'),
    update: (update: UpdateNotificationsRequest) =>
      request<NotificationsResponse>('/notifications', { method: 'PATCH', body: JSON.stringify(update) }),
  },
  portForwarding: {
    list: () => request<{ rules: unknown[] }>('/port-forwarding'),
    add: (rule: unknown) => request<{ ok: true }>('/port-forwarding', { method: 'POST', body: JSON.stringify(rule) }),
    remove: (index: number) => request<{ ok: true }>(`/port-forwarding/${index}`, { method: 'DELETE' }),
  },
  ddns: {
    get: () => request<{ config: unknown }>('/ddns'),
    update: (update: unknown) => request<{ ok: true }>('/ddns', { method: 'PUT', body: JSON.stringify(update) }),
  },
  firewall: {
    get: () => request<{ rules: unknown[]; cyberSecure: unknown }>('/firewall'),
    parentalControls: () => request<{ parentalControls: unknown }>('/firewall/parental-controls'),
  },
  qos: {
    get: () => request<{ settings: unknown }>('/qos'),
    update: (update: unknown) => request<{ ok: true }>('/qos', { method: 'PUT', body: JSON.stringify(update) }),
  },
  voip: {
    list: () => request<{ lines: unknown[] }>('/voip'),
  },
  usb: {
    get: () => request<{ status: unknown }>('/usb'),
  },
  system: {
    get: () => request<{ account: unknown; remoteManagement: unknown }>('/system'),
    reboot: () => request<{ ok: true }>('/system/reboot', { method: 'POST' }),
    changePassword: (oldPassword: string, newPassword: string) =>
      request<{ ok: true }>('/system/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      }),
  },
};

export const api: typeof serverApi = Capacitor.isNativePlatform() ? directApi as unknown as typeof serverApi : serverApi;

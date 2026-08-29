import { registerPlugin } from '@capacitor/core';

interface RouterPlugin {
  configure(options: { baseUrl: string; username: string; password: string; fingerprint?: string }): Promise<void>;
  login(): Promise<{ fingerprint: string }>;
  daoGet<T>(options: { oid: string }): Promise<{ data: T }>;
  daoSet<T>(options: { oid: string; payload: unknown; method?: 'POST' | 'PUT' }): Promise<{ data: T }>;
  cgiCall<T>(options: { name: string; payload?: unknown }): Promise<{ data: T }>;
  logout(): Promise<void>;
}

export const nativeRouter = registerPlugin<RouterPlugin>('RouterHttp');

interface AppPrefsPlugin {
  setNotificationPrefs(options: { newDevices: boolean; routerOffline: boolean; backgroundChecks: boolean; intervalMinutes: number }): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
}

// Mirrors notification preferences into native SharedPreferences and (de)schedules the
// WorkManager background check (see AppPrefsPlugin.java). A background job has no webview
// to call back into, so this is the only way it learns what the user configured.
export const nativeAppPrefs = registerPlugin<AppPrefsPlugin>('AppPrefs');

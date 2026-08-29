import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const SESSION_KEY = 'router-manager-session-v1';

export interface StoredSession {
  serverUrl: string;
  username: string;
  password: string;
  fingerprint: string;
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const raw = Capacitor.isNativePlatform()
    ? await SecureStorage.getItem(SESSION_KEY)
    : sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as StoredSession;
    return session;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function saveStoredSession(session: StoredSession): Promise<void> {
  const raw = JSON.stringify(session);
  if (Capacitor.isNativePlatform()) {
    await SecureStorage.setItem(SESSION_KEY, raw);
  } else {
    sessionStorage.setItem(SESSION_KEY, raw);
  }
}

export async function clearStoredSession(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await SecureStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

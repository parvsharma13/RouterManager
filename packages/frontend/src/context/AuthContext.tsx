import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import type { LoginRequest } from '@router-manager/shared';
import { api, configureApi } from '@/lib/api-client';
import { nativeRouter } from '@/lib/router-native';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  type StoredSession,
} from '@/lib/auth-storage';

interface LoginInput extends LoginRequest {
  serverUrl: string;
}

interface AuthContextValue {
  session: StoredSession | null;
  restoring: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeServerUrl(value: string): string {
  const candidate = value.trim().replace(/\/$/, '');
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Enter a full router address, for example https://192.168.1.1');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/') {
    throw new Error('Enter only the router address, without an extra path.');
  }
  if (url.protocol !== 'https:') throw new Error('Use the router HTTPS address.');
  return url.origin;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [restoring, setRestoring] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (session) await api.auth.logout();
    } catch {
      // Local session removal must still succeed if the server is offline.
    }
    configureApi('', '');
    await clearStoredSession();
    setSession(null);
  }, [session]);

  useEffect(() => {
    loadStoredSession()
      .then(async (stored) => {
        if (!stored) return;
        if (Capacitor.isNativePlatform()) {
          await nativeRouter.configure({ baseUrl: stored.serverUrl, username: stored.username, password: stored.password, fingerprint: stored.fingerprint });
          setSession(stored);
          return;
        }
        // The web/dev-mode backend session is short-lived and in-memory (see README's
        // "For contributors" section) and doesn't survive a page reload, so restoring here
        // means signing in again with the stored username/password rather than replaying a
        // token that's already gone.
        configureApi(stored.serverUrl);
        const result = await api.auth.login({ username: stored.username, password: stored.password });
        configureApi(stored.serverUrl, result.token);
        setSession(stored);
      })
      .catch(() => configureApi('', ''))
      .finally(() => setRestoring(false));
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => void logout();
    window.addEventListener('router-manager:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('router-manager:unauthorized', handleUnauthorized);
  }, [logout]);

  const login = useCallback(async (input: LoginInput) => {
    const username = input.username.trim();

    if (Capacitor.isNativePlatform()) {
      const serverUrl = normalizeServerUrl(input.serverUrl);
      try {
        await nativeRouter.configure({ baseUrl: serverUrl, username, password: input.password });
        const result = await nativeRouter.login();
        const next: StoredSession = { serverUrl, username, password: input.password, fingerprint: result.fingerprint };
        await saveStoredSession(next);
        setSession(next);
      } catch (error) {
        configureApi('', '');
        throw error;
      }
      return;
    }

    // Web/dev mode: "server address" is the backend origin (proxied /api to the Express
    // server holding the real router session). See README's "For contributors" section.
    const serverUrl = input.serverUrl.trim().replace(/\/$/, '') || window.location.origin;
    try {
      configureApi(serverUrl);
      const result = await api.auth.login({ username, password: input.password });
      configureApi(serverUrl, result.token);
      const next: StoredSession = { serverUrl, username, password: input.password, fingerprint: '' };
      await saveStoredSession(next);
      setSession(next);
    } catch (error) {
      configureApi('', '');
      throw error;
    }
  }, []);

  const value = useMemo(() => ({ session, restoring, login, logout }), [session, restoring, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

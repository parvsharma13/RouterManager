import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CapabilityMap, CapabilityStatus, FeatureCapability, RouterCompatibility } from '@router-manager/shared';
import { api } from '@/lib/api-client';

interface CapabilitiesContextValue {
  capabilities: CapabilityMap;
  compatibility: RouterCompatibility | null;
  loading: boolean;
  error: string | null;
  capability: (key: string) => FeatureCapability;
  canWrite: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const fallback = (key: string, status: CapabilityStatus = 'unknown'): FeatureCapability => ({
  key,
  label: key,
  read: status === 'supported' ? 'available' : status === 'unsupported' ? 'unavailable' : 'unknown',
  write: 'blocked',
  reason: status === 'unsupported' ? 'This feature is not exposed by the connected router.' : 'Support has not been verified for this router and firmware.',
  source: 'live-probe',
  lastVerifiedFirmware: null,
});

function normalize(key: string, value: CapabilityMap[string] | undefined): FeatureCapability {
  return typeof value === 'object' && value !== null ? value : fallback(key, value);
}

const CapabilitiesContext = createContext<CapabilitiesContextValue | null>(null);

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<CapabilityMap>({});
  const [compatibility, setCompatibility] = useState<RouterCompatibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.capabilities();
      setCapabilities(response.capabilities);
      setCompatibility(response.compatibility ?? null);
    } catch (caught) {
      setCapabilities({});
      setCompatibility(null);
      setError(caught instanceof Error ? caught.message : 'Could not check router compatibility.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<CapabilitiesContextValue>(() => ({
    capabilities,
    compatibility,
    loading,
    error,
    capability: (key) => normalize(key, capabilities[key]),
    canWrite: (key) => normalize(key, capabilities[key]).write === 'verified' && compatibility?.supportLevel === 'verified',
    refresh,
  }), [capabilities, compatibility, loading, error, refresh]);

  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities() {
  const value = useContext(CapabilitiesContext);
  if (!value) throw new Error('useCapabilities must be used within CapabilitiesProvider');
  return value;
}

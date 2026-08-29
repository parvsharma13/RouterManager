import type { ReactNode } from 'react';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { InlineNotice } from '@/components/shared/mobile-ui';

export function FeatureGate({ oid, children }: { oid: string; children: ReactNode }) {
  const { capability, loading } = useCapabilities();
  if (loading) return null;
  const feature = capability(oid);
  if (feature.read === 'unavailable') return <InlineNotice title="Not available on this router">{feature.reason}</InlineNotice>;
  return <>{children}</>;
}

import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '@/lib/api-client';
import { RawJsonCard } from '@/components/shared/RawJsonCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { PageHeader } from '@/components/shared/mobile-ui';

export function Firewall() {
  const [data, setData] = useState<{ rules: unknown[]; cyberSecure: unknown } | null>(null);
  const [parentalControls, setParentalControls] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.firewall.get(), api.firewall.parentalControls()])
      .then(([firewall, parental]) => {
        setData(firewall);
        setParentalControls(parental.parentalControls);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load firewall settings'));
  }, []);

  return (
    <FeatureGate oid="firewall_acl">
      <div>
        <PageHeader eyebrow="Network" title="Firewall & security" description="Read-only. This app doesn't yet write firewall rules on this router." />
        <div className="space-y-4">
          {error && <ErrorState message={error} />}
          {!data && !error && <LoadingState rows={3} />}
          {data && (
            <>
              <RawJsonCard title="Firewall rules" data={data.rules} />
              <RawJsonCard title="Security level" data={data.cyberSecure} />
              <RawJsonCard title="Parental controls" data={parentalControls} />
            </>
          )}
        </div>
      </div>
    </FeatureGate>
  );
}

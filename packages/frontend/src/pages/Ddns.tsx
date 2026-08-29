import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '@/lib/api-client';
import { RawJsonCard } from '@/components/shared/RawJsonCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { PageHeader } from '@/components/shared/mobile-ui';

export function Ddns() {
  const [config, setConfig] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .ddns.get()
      .then((res) => setConfig(res.config))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load DDNS settings'));
  }, []);

  return (
    <FeatureGate oid="dns">
      <div>
        <PageHeader eyebrow="Network" title="Dynamic DNS" description="Write support isn't confirmed against the live device yet, so this shows current settings read-only." />
        {error && <ErrorState message={error} />}
        {config === undefined && !error && <LoadingState rows={2} />}
        {config !== undefined && <RawJsonCard title="DDNS config" data={config} />}
      </div>
    </FeatureGate>
  );
}

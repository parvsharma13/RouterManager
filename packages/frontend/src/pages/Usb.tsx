import { useEffect, useState } from 'react';
import type { UsbDeviceStatus } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RawJsonCard } from '@/components/shared/RawJsonCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { PageHeader } from '@/components/shared/mobile-ui';

export function Usb() {
  const [status, setStatus] = useState<UsbDeviceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .usb.get()
      .then((res) => setStatus(res.status as UsbDeviceStatus))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load USB status'));
  }, []);

  return (
    <FeatureGate oid="usb_info">
      <div>
        <PageHeader eyebrow="Connected services" title="USB" description="Read-only status of any USB device attached to your router." />
        <div className="space-y-4">
          {error && <ErrorState message={error} />}
          {!status && !error && <LoadingState rows={2} />}
          {status && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className={status.connected ? 'border-success/30 text-success' : ''}>
                    {status.connected ? 'Device connected' : 'No device connected'}
                  </Badge>
                </CardContent>
              </Card>
              <RawJsonCard title="Raw details" data={status.raw} />
            </>
          )}
        </div>
      </div>
    </FeatureGate>
  );
}

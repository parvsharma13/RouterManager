import { useEffect, useState } from 'react';
import type { VoipLineStatus } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { PageHeader, Surface } from '@/components/shared/mobile-ui';

export function Voip() {
  const [lines, setLines] = useState<VoipLineStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .voip.list()
      .then((res) => setLines(res.lines as VoipLineStatus[]))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load VoIP status'));
  }, []);

  return (
    <FeatureGate oid="sip_account">
      <div>
        <PageHeader eyebrow="Connected services" title="VoIP" description="Read-only — these lines are provisioned by your ISP, not editable from this app." />
        {error && <ErrorState message={error} />}
        {!lines && !error && <LoadingState rows={2} />}
        {lines && (
          <Surface className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.index}>
                    <TableCell>{l.index}</TableCell>
                    <TableCell>{l.directoryNumber || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={l.enable ? 'border-success/30 text-success' : ''}>
                        {l.status || (l.enable ? 'Enabled' : 'Disabled')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Surface>
        )}
      </div>
    </FeatureGate>
  );
}

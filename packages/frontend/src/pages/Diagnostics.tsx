import { useState } from 'react';
import { CircleCheck, CircleX, RotateCw, TriangleAlert } from 'lucide-react';
import type { DiagnosticCheck, DiagnosticsResult } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { InlineNotice, PageHeader, Surface } from '@/components/shared/mobile-ui';
import { Button } from '@/components/ui/button';

const GUIDANCE: Record<DiagnosticCheck['key'], string> = {
  router: 'Move closer to your router, or confirm your phone is on the same Wi-Fi network.',
  wan: "Check your Hyperoptic ONT/fibre socket and try restarting the router from Settings › Administrator.",
  dns: 'DNS not reporting is usually temporary. Run the check again in a minute.',
};

function CheckRow({ check }: { check: DiagnosticCheck }) {
  const Icon = check.status === 'pass' ? CircleCheck : check.status === 'warning' ? TriangleAlert : CircleX;
  const tone = check.status === 'pass' ? 'text-success' : check.status === 'warning' ? 'text-warning' : 'text-destructive';
  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <Icon aria-hidden="true" className={`size-5 shrink-0 ${tone}`} />
        <span className="min-w-0 flex-1 font-semibold">{check.label}</span>
      </div>
      <p className="mt-1 pl-8 text-sm text-muted-foreground">{check.detail}</p>
      {check.status !== 'pass' && <p className="mt-1 pl-8 text-xs text-muted-foreground">{GUIDANCE[check.key]}</p>}
    </div>
  );
}

export function Diagnostics() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.diagnostics.run();
      setResult(res.result);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Could not run the network check.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Router" title="Network check" description="Confirm the router responds, your internet connection is up, and DNS is configured." />

      <Button type="button" onClick={run} disabled={running} className="mb-6 w-full">
        <RotateCw aria-hidden="true" className={`mr-2 size-4 ${running ? 'animate-spin' : ''}`} />
        {running ? 'Checking…' : result ? 'Run again' : 'Run network check'}
      </Button>

      {error && <InlineNotice tone="error" title="Check failed">{error}</InlineNotice>}

      {result && (
        <div className="space-y-4">
          <Surface>{result.checks.map((check) => <CheckRow key={check.key} check={check} />)}</Surface>
          <p className="px-1 text-xs text-muted-foreground">
            {result.routerLatencyMs !== null ? `Router responded in ${result.routerLatencyMs} ms` : 'Router did not respond'} · Checked {new Date(result.checkedAt).toLocaleTimeString()}
          </p>
        </div>
      )}

      {!result && !error && (
        <Surface className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Run a check to see router reachability, internet status, and DNS configuration.</p>
        </Surface>
      )}
    </div>
  );
}

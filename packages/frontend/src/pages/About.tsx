import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ClipboardCopy, CircleCheck, CircleX, FlaskConical } from 'lucide-react';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { CapabilityLabel, InlineNotice, PageHeader, SectionTitle, StatusPill, Surface } from '@/components/shared/mobile-ui';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DISCLAIMER =
  "Router Manager is an unofficial, open-source Android companion for Hyperoptic Internet customers using compatible Hyperhub routers. It is not affiliated with or endorsed by Hyperoptic, Zyxel, Amazon, or eero.";

export function About() {
  const { compatibility, capabilities, capability, loading } = useCapabilities();
  const [appVersion, setAppVersion] = useState('Web preview build');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    App.getInfo()
      .then((info) => setAppVersion(`${info.version} (build ${info.build})`))
      .catch(() => {});
  }, []);

  const copyReport = async () => {
    const report = {
      appVersion,
      compatibility,
      capabilities: Object.keys(capabilities).map((key) => capability(key)),
      generatedAt: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      toast.success('Diagnostic report copied. Paste it into a GitHub issue.');
    } catch {
      toast.error('Could not access the clipboard.');
    }
  };

  const tone = compatibility?.supportLevel === 'verified' ? 'success' : compatibility?.supportLevel === 'experimental' ? 'warning' : 'error';
  const Icon = compatibility?.supportLevel === 'verified' ? CircleCheck : compatibility?.supportLevel === 'experimental' ? FlaskConical : CircleX;

  return (
    <div>
      <PageHeader eyebrow="Router" title="About & compatibility" description="What this app knows about your router, and what it will and won't change." />

      {loading && <LoadingState rows={5} />}

      {!loading && compatibility && (
        <div className="space-y-7">
          <Surface className="p-5">
            <div className="flex items-start gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone === 'success' ? 'bg-success/12 text-success' : tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-destructive/12 text-destructive'}`}>
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <StatusPill state={tone}>{compatibility.supportLevel === 'verified' ? 'Verified router' : compatibility.supportLevel === 'experimental' ? 'Experimental router' : 'Unsupported router'}</StatusPill>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{compatibility.message}</p>
              </div>
            </div>
          </Surface>

          <div>
            <SectionTitle>Router identity</SectionTitle>
            <Surface>
              <Row label="Manufacturer" value={compatibility.manufacturer} />
              <Row label="Model" value={compatibility.model} />
              <Row label="Firmware" value={compatibility.firmware} />
              <Row label="Checked" value={new Date(compatibility.detectedAt).toLocaleString()} />
            </Surface>
          </div>

          <div>
            <SectionTitle>Feature support report</SectionTitle>
            <Surface>
              {Object.keys(capabilities).sort().map((key) => {
                const feature = capability(key);
                return (
                  <div key={key} className="flex min-h-14 items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
                    <span className="min-w-0 flex-1 text-sm font-semibold">{feature.label}</span>
                    <StatusPill state={feature.read === 'available' ? 'success' : feature.read === 'unknown' ? 'neutral' : 'error'}>
                      {feature.read === 'available' ? 'Readable' : feature.read === 'unknown' ? 'Unknown' : 'Not exposed'}
                    </StatusPill>
                    <CapabilityLabel write={feature.write} />
                  </div>
                );
              })}
            </Surface>
            <p className="mt-3 px-1 text-xs leading-5 text-muted-foreground">Raw router object IDs behind these rows are available in the diagnostic report below, useful when reporting a bug.</p>
          </div>

          <Button type="button" variant="outline" onClick={copyReport} className="w-full">
            <ClipboardCopy aria-hidden="true" className="mr-2 size-4" />
            Copy diagnostic report
          </Button>

          <InlineNotice tone="warning" title="Unofficial project">
            {DISCLAIMER}
          </InlineNotice>

          <p className="text-center text-xs text-muted-foreground">Router Manager · {appVersion}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto truncate text-sm font-semibold">{value || 'Not reported'}</span>
    </div>
  );
}

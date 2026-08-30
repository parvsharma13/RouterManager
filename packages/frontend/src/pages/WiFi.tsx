import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Wifi as WifiIcon } from 'lucide-react';
import type { WlanBand } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { WifiQrDialog } from '@/components/shared/WifiQrDialog';
import { PageHeader, StatusPill, Surface } from '@/components/shared/mobile-ui';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { toast } from 'sonner';

const schema = z.object({
  ssid: z.string().min(1).max(32),
  psk: z.string().min(8).max(63),
  enabled: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function WiFi() {
  const [bands, setBands] = useState<WlanBand[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { canWrite } = useCapabilities();

  const load = () => {
    setError(null);
    api
      .wifi.get()
      .then((res) => setBands(res.bands))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load WiFi settings'));
  };

  useEffect(load, []);

  return (
    <div>
      <PageHeader eyebrow="Network" title="Wi-Fi" description="Network names, passwords, and bands broadcast by your router." />
      {error && <ErrorState message={error} />}
      {!bands && !error && <LoadingState rows={3} />}
      {bands && (
        <div className="space-y-5">
          {bands.map((band) => (
            <WifiBandCard key={band.index} band={band} onSaved={load} writable={canWrite('wlan')} />
          ))}
        </div>
      )}
    </div>
  );
}

function WifiBandCard({ band, onSaved, writable }: { band: WlanBand; onSaved: () => void; writable: boolean }) {
  const [showPsk, setShowPsk] = useState(false);
  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ssid: band.ssid, psk: band.pskDisplay, enabled: band.enabled },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.wifi.update({ index: band.index, ...values });
      toast.success(`${band.band} network updated`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to update WiFi');
    }
  };

  return (
    <Surface className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><WifiIcon aria-hidden="true" className="size-5" /></span>
          <div>
            <p className="font-bold">{band.band}</p>
            <p className="text-xs text-muted-foreground">{band.mainSsid ? 'Main network' : 'Guest network'} · {band.securityMode}</p>
          </div>
        </div>
        <StatusPill state={band.enabled ? 'success' : 'neutral'}>{band.enabled ? 'On' : 'Off'}</StatusPill>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`ssid-${band.index}`}>Network name (SSID)</Label>
          <Input id={`ssid-${band.index}`} autoComplete="off" {...register('ssid')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`psk-${band.index}`}>Password</Label>
          <div className="relative">
            <Input id={`psk-${band.index}`} type={showPsk ? 'text' : 'password'} autoComplete="new-password" className="pr-12" {...register('psk')} />
            <button
              type="button"
              onClick={() => setShowPsk((v) => !v)}
              aria-label={showPsk ? 'Hide password' : 'Show password'}
              className="absolute right-0 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPsk ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
            </button>
          </div>
        </div>
        <div className="flex min-h-12 items-center gap-2">
          <Controller
            control={control}
            name="enabled"
            render={({ field }) => (
              <Switch id={`enabled-${band.index}`} checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor={`enabled-${band.index}`}>Network enabled</Label>
        </div>
        {!writable && <p className="text-xs text-muted-foreground">Saving is disabled until this router model and firmware are verified. See Settings › About & compatibility.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={formState.isSubmitting || !writable} className="flex-1 sm:flex-none">Save</Button>
          <WifiQrDialog ssid={band.ssid} psk={band.pskDisplay} securityMode={band.securityMode} hidden={band.hidden} />
        </div>
      </form>
    </Surface>
  );
}

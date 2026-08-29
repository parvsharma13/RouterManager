import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { QosSettings } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { PageHeader } from '@/components/shared/mobile-ui';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { toast } from 'sonner';

export function Qos() {
  const [settings, setSettings] = useState<QosSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, reset, formState } = useForm<QosSettings>();
  const { canWrite } = useCapabilities();

  useEffect(() => {
    api
      .qos.get()
      .then((res) => {
        const s = res.settings as QosSettings;
        setSettings(s);
        reset(s);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load QoS settings'));
  }, [reset]);

  const onSubmit = async (values: QosSettings) => {
    try {
      await api.qos.update({ enable: values.enable, upRate: Number(values.upRate), downRate: Number(values.downRate) });
      toast.success('QoS settings updated');
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to update QoS settings');
    }
  };

  return (
    <FeatureGate oid="qos">
      <div>
        <PageHeader eyebrow="Network" title="Quality of service" description="Prioritise bandwidth across your network." />
        <div className="space-y-4">
          {error && <ErrorState message={error} />}
          {!settings && !error && <LoadingState rows={3} />}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle>Bandwidth management</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="flex min-h-12 items-center gap-2">
                    <Controller
                      control={control}
                      name="enable"
                      render={({ field }) => (
                        <Switch id="qos-enable" checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                    <Label htmlFor="qos-enable">QoS enabled</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Upload rate (kbps)</Label>
                      <Input type="number" {...register('upRate', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Download rate (kbps)</Label>
                      <Input type="number" {...register('downRate', { valueAsNumber: true })} />
                    </div>
                  </div>
                  {!canWrite('qos') && <p className="text-xs text-muted-foreground">Saving is disabled until this router model and firmware are verified — see Settings › About & compatibility.</p>}
                  <Button type="submit" disabled={formState.isSubmitting || !canWrite('qos')} className="w-full">
                    Save
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </FeatureGate>
  );
}

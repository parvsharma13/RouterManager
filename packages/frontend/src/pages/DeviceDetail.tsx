import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Cable, ChevronLeft, Clock3, Fingerprint, MapPin, Signal, Wifi } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import type { DeviceGroup, DeviceIcon, ManagedDevice } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { deviceIconComponent, DEVICE_ICON_LABELS, DEVICE_ICONS } from '@/lib/device-icons';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader, SectionTitle, SettingsRow, StatusPill, Surface } from '@/components/shared/mobile-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface DeviceForm {
  customName: string;
  icon: DeviceIcon;
  groupId: string;
  notes: string;
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DeviceDetail() {
  const { mac = '' } = useParams<{ mac: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<ManagedDevice | null | undefined>(undefined);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, reset, formState } = useForm<DeviceForm>();

  const load = () => {
    setError(null);
    Promise.all([api.devices.list(), api.groups.list()])
      .then(([deviceResult, groupResult]) => {
        const found = deviceResult.devices.find((item) => item.macAddress === mac) ?? null;
        setDevice(found);
        setGroups(groupResult.groups);
        if (found) {
          reset({
            customName: found.customName ?? '',
            icon: found.icon ?? 'other',
            groupId: found.groupId ? String(found.groupId) : 'none',
            notes: found.notes ?? '',
          });
        }
      })
      .catch((caught) => setError(caught instanceof ApiRequestError ? caught.message : 'Could not load this device.'));
  };

  useEffect(load, [mac]);

  const onSubmit = async (values: DeviceForm) => {
    try {
      await api.devices.update(mac, {
        customName: values.customName.trim() || null,
        icon: values.icon,
        groupId: values.groupId === 'none' ? null : Number(values.groupId),
        notes: values.notes.trim() || null,
      });
      toast.success('Device updated');
      load();
    } catch (caught) {
      toast.error(caught instanceof ApiRequestError ? caught.message : 'Failed to update device');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/devices')}
        className="mb-3 flex min-h-10 items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Devices
      </button>

      {error && <ErrorState message={error} />}
      {device === undefined && !error && <LoadingState rows={6} />}

      {device === null && !error && (
        <Surface className="p-8 text-center">
          <p className="font-semibold">Device not found</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have left the network. <Link to="/devices" className="text-primary underline-offset-4 hover:underline">Back to devices</Link></p>
        </Surface>
      )}

      {device && (
        <>
          <PageHeader
            eyebrow={device.active ? 'Online now' : 'Last seen ' + formatWhen(device.lastSeenAt)}
            title={device.displayName}
            action={<StatusPill state={device.active ? 'success' : 'neutral'}>{device.active ? 'Online' : 'Offline'}</StatusPill>}
          />

          <div className="space-y-7">
            <div>
              <SectionTitle>Network details</SectionTitle>
              <Surface>
                <SettingsRow icon={MapPin} title="IP address" value={device.ipAddress || 'Unknown'} />
                <SettingsRow icon={Fingerprint} title="MAC address" value={device.macAddress} />
                <SettingsRow icon={device.interfaceType?.toLowerCase().includes('ethernet') ? Cable : Wifi} title="Connection" value={device.connectionType || device.interfaceType || 'Unknown'} />
                {device.signalStrength !== null && <SettingsRow icon={Signal} title="Signal strength" value={`${device.signalStrength} dBm`} />}
                <SettingsRow icon={Clock3} title="First seen" value={formatWhen(device.firstSeenAt)} />
                <SettingsRow icon={Clock3} title="Last seen" value={formatWhen(device.lastSeenAt)} />
              </Surface>
            </div>

            <div>
              <SectionTitle>Household details</SectionTitle>
              <Surface className="p-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customName">Nickname</Label>
                    <Input id="customName" placeholder={device.hostName} {...register('customName', { maxLength: 64 })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Icon</Label>
                      <Controller
                        control={control}
                        name="icon"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DEVICE_ICONS.map((icon) => {
                                const Icon = deviceIconComponent(icon);
                                return (
                                  <SelectItem key={icon} value={icon}>
                                    <Icon aria-hidden="true" className="size-4" /> {DEVICE_ICON_LABELS[icon]}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Profile</Label>
                      <Controller
                        control={control}
                        name="groupId"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No profile</SelectItem>
                              {groups.map((group) => (
                                <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" placeholder="Optional (e.g. 'kitchen speaker')" {...register('notes', { maxLength: 500 })} />
                  </div>
                  <Button type="submit" disabled={formState.isSubmitting} className="w-full">
                    Save changes
                  </Button>
                </form>
              </Surface>
              <p className="mt-3 px-1 text-xs leading-5 text-muted-foreground">Saved only on this phone. The router itself has no concept of nicknames, icons, or profiles.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Pause, Play, Plus, Trash2, Users } from 'lucide-react';
import type { DeviceGroup, ManagedDevice, Policy, DeviceIcon } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { DEVICE_ICON_LABELS, DEVICE_ICONS } from '@/lib/device-icons';
import { DeviceGlyph } from '@/components/shared/DeviceGlyph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader, SectionTitle, StatusPill, Surface } from '@/components/shared/mobile-ui';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { toast } from 'sonner';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Profiles() {
  const [profiles, setProfiles] = useState<DeviceGroup[] | null>(null);
  const [devices, setDevices] = useState<ManagedDevice[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [managing, setManaging] = useState<DeviceGroup | null>(null);

  const load = () => {
    setError(null);
    Promise.all([api.groups.list(), api.devices.list(), api.policies.list()])
      .then(([g, d, p]) => {
        setProfiles(g.groups);
        setDevices(d.devices);
        setPolicies(p.policies);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load profiles'));
  };

  useEffect(load, []);

  const onDelete = async (id: number) => {
    try {
      await api.groups.remove(id);
      toast.success('Profile deleted');
      load();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to delete profile');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Household"
        title="Profiles"
        description="Group devices to pause internet access or schedule an offline window (like bedtime) for everyone at once."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="icon" aria-label="New profile"><Plus aria-hidden="true" /></Button>
            </DialogTrigger>
            <CreateProfileDialog onCreated={() => { setCreateOpen(false); load(); }} />
          </Dialog>
        }
      />

      {error && <ErrorState message={error} />}
      {!profiles && !error && <LoadingState rows={3} />}

      {profiles && profiles.length === 0 && (
        <Surface className="p-8 text-center">
          <Users aria-hidden="true" className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">No profiles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create one to group devices for the whole household.</p>
        </Surface>
      )}

      {profiles && profiles.length > 0 && (
        <Surface>
          {profiles.map((profile) => {
            const profilePolicies = policies.filter((p) => p.targetType === 'group' && p.targetId === String(profile.id));
            const paused = profilePolicies.some((p) => p.type === 'pause' && p.enabled);
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => setManaging(profile)}
                className="flex min-h-[76px] w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <DeviceGlyph icon={profile.icon} aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{profile.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {profile.deviceCount} device{profile.deviceCount === 1 ? '' : 's'}
                  </span>
                </span>
                {paused && <StatusPill state="warning">Paused</StatusPill>}
              </button>
            );
          })}
        </Surface>
      )}

      {managing && (
        <ManageProfileDialog
          profile={managing}
          devices={devices.filter((d) => d.groupId === managing.id)}
          policies={policies.filter((p) => p.targetType === 'group' && p.targetId === String(managing.id))}
          onClose={() => setManaging(null)}
          onChanged={load}
          onDelete={() => { setManaging(null); void onDelete(managing.id); }}
        />
      )}
    </div>
  );
}

interface CreateProfileForm {
  name: string;
  icon: DeviceIcon;
}

function CreateProfileDialog({ onCreated }: { onCreated: () => void }) {
  const { register, handleSubmit, control } = useForm<CreateProfileForm>({ defaultValues: { icon: 'other' } });

  const onSubmit = async (values: CreateProfileForm) => {
    try {
      await api.groups.create(values);
      toast.success('Profile created');
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to create profile');
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New profile</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input placeholder="Kids' devices" {...register('name', { required: true })} />
        </div>
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
                  {DEVICE_ICONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {DEVICE_ICON_LABELS[icon]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" className="w-full">Create</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

interface ScheduleForm {
  days: number[];
  startTime: string;
  endTime: string;
}

function ManageProfileDialog({
  profile,
  devices,
  policies,
  onClose,
  onChanged,
  onDelete,
}: {
  profile: DeviceGroup;
  devices: ManagedDevice[];
  policies: Policy[];
  onClose: () => void;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const { canWrite } = useCapabilities();
  const writable = canWrite('wlan_sch_access');
  const pausePolicy = policies.find((p) => p.type === 'pause');
  const schedulePolicy = policies.find((p) => p.type === 'schedule');
  const paused = pausePolicy?.enabled ?? false;

  const { register, handleSubmit, watch, setValue } = useForm<ScheduleForm>({
    defaultValues:
      schedulePolicy?.type === 'schedule'
        ? { days: schedulePolicy.days, startTime: schedulePolicy.startTime, endTime: schedulePolicy.endTime }
        : { days: [1, 2, 3, 4, 5], startTime: '21:00', endTime: '07:00' },
  });
  const selectedDays = watch('days');

  const togglePause = async () => {
    try {
      const result = pausePolicy
        ? await api.policies.update(pausePolicy.id, { enabled: !pausePolicy.enabled })
        : await api.policies.create({ targetType: 'group', targetId: String(profile.id), type: 'pause', enabled: true });
      if (result.policy.enforcement !== 'native') {
        toast.warning("Saved, but the router didn't confirm it; devices in this profile may still be online.");
      } else {
        toast.success(result.policy.enabled ? 'Profile paused' : 'Profile resumed');
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to update pause state');
    }
  };

  const onSaveSchedule = async (values: ScheduleForm) => {
    try {
      const result = schedulePolicy
        ? await api.policies.update(schedulePolicy.id, { ...values, enabled: true })
        : await api.policies.create({ targetType: 'group', targetId: String(profile.id), type: 'schedule', enabled: true, ...values });
      if (result.policy.enforcement !== 'native') {
        toast.warning("Schedule saved locally, but the router didn't confirm it; it may not actually enforce yet.");
      } else {
        toast.success('Schedule saved');
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to save schedule');
    }
  };

  const removeSchedule = async () => {
    if (!schedulePolicy) return;
    try {
      await api.policies.remove(schedulePolicy.id);
      toast.success('Schedule removed');
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Failed to remove schedule');
    }
  };

  const toggleDay = (day: number) => {
    const next = selectedDays.includes(day) ? selectedDays.filter((d) => d !== day) : [...selectedDays, day];
    setValue('days', next);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            {profile.name}
            <ConfirmDialog
              trigger={<Button type="button" variant="ghost" size="icon-sm" aria-label="Delete profile"><Trash2 aria-hidden="true" className="size-4" /></Button>}
              title={`Delete "${profile.name}"?`}
              description="Devices in this profile aren't removed from the network; they just lose their profile and any policies attached to it."
              confirmLabel="Delete"
              destructive
              onConfirm={onDelete}
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <SectionTitle>Devices</SectionTitle>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices assigned yet. Assign them from a device's detail screen.</p>
            ) : (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {devices.map((d) => (
                  <li key={d.macAddress}>{d.displayName}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Pause internet now</p>
                <p className="text-xs text-muted-foreground">Blocks every device in this profile immediately.</p>
              </div>
              <Button variant={paused ? 'destructive' : 'outline'} size="sm" onClick={togglePause} disabled={!writable}>
                {paused ? <Play aria-hidden="true" className="mr-2 size-4" /> : <Pause aria-hidden="true" className="mr-2 size-4" />}
                {paused ? 'Resume' : 'Pause'}
              </Button>
            </div>
            {!writable && <p className="mt-2 text-xs text-muted-foreground">Not yet available. The router hasn't confirmed it can enforce a pause for this firmware.</p>}
          </div>

          <form onSubmit={handleSubmit(onSaveSchedule)} className="space-y-3 rounded-2xl border p-4">
            <p className="text-sm font-semibold">Scheduled offline window</p>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => (
                <label key={i} className="flex min-h-12 items-center gap-2 text-sm">
                  <Checkbox checked={selectedDays.includes(i)} onCheckedChange={() => toggleDay(i)} disabled={!writable} />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="time" disabled={!writable} {...register('startTime', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="time" disabled={!writable} {...register('endTime', { required: true })} />
              </div>
            </div>
            {!writable && <p className="text-xs text-muted-foreground">Not yet available. Scheduled pauses aren't confirmed to work on this router's firmware yet.</p>}
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={!writable}>{schedulePolicy ? 'Update schedule' : 'Create schedule'}</Button>
              {schedulePolicy && <Button type="button" variant="ghost" size="sm" onClick={removeSchedule}>Remove</Button>}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

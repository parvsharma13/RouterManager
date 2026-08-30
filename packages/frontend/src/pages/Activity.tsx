import { useEffect, useState } from 'react';
import {
  Activity as ActivityIcon,
  CircleCheck,
  CircleX,
  RotateCw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Wifi,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import type { DeviceEvent } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader, Surface } from '@/components/shared/mobile-ui';

const EVENT_META: Record<DeviceEvent['eventType'], { icon: LucideIcon; label: string }> = {
  new_device: { icon: Sparkles, label: 'New device joined' },
  device_online: { icon: Wifi, label: 'Device came online' },
  device_offline: { icon: WifiOff, label: 'Device went offline' },
  router_online: { icon: CircleCheck, label: 'Router back online' },
  router_offline: { icon: CircleX, label: 'Router unreachable' },
  settings_changed: { icon: SlidersHorizontal, label: 'Setting changed' },
  reboot_requested: { icon: RotateCw, label: 'Reboot requested' },
  certificate_changed: { icon: ShieldAlert, label: 'Router certificate changed' },
  diagnostic_result: { icon: ActivityIcon, label: 'Network check' },
};

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function Activity() {
  const [events, setEvents] = useState<DeviceEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.devices
      .events()
      .then((res) => setEvents(res.events))
      .catch((caught) => setError(caught instanceof ApiRequestError ? caught.message : 'Could not load activity.'));
  }, []);

  const groups: { day: string; items: DeviceEvent[] }[] = [];
  for (const event of events ?? []) {
    const day = dayLabel(event.occurredAt);
    const bucket = groups.find((g) => g.day === day);
    if (bucket) bucket.items.push(event);
    else groups.push({ day, items: [event] });
  }

  return (
    <div>
      <PageHeader eyebrow="History" title="Activity" description="New devices, router state changes, and configuration actions on this network." />

      {error && <ErrorState message={error} />}
      {!events && !error && <LoadingState rows={6} />}

      {events && events.length === 0 && (
        <Surface className="p-8 text-center">
          <ActivityIcon aria-hidden="true" className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Nothing to show yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Activity appears here as devices connect, disconnect, or you change a setting.</p>
        </Surface>
      )}

      {events && events.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.day}>
              <h2 className="mb-2 min-h-10 px-1 pt-2 text-sm font-semibold text-on-surface-variant">{group.day}</h2>
              <Surface>
                {group.items.map((event) => {
                  const meta = EVENT_META[event.eventType] ?? { icon: ActivityIcon, label: event.eventType.replaceAll('_', ' ') };
                  const Icon = meta.icon;
                  return (
                    <div key={event.id} className="flex min-h-[72px] items-start gap-3 border-b border-outline-variant px-4 py-3 last:border-b-0">
                      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-secondary-container text-secondary-container-foreground">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{meta.label}</span>
                          <span className="shrink-0 text-xs font-medium text-muted-foreground">{timeLabel(event.occurredAt)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{event.detail || event.displayName}</span>
                      </span>
                    </div>
                  );
                })}
              </Surface>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { NotificationPreferences } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { nativeAppPrefs } from '@/lib/router-native';
import { InlineNotice, PageHeader, SectionTitle, Surface } from '@/components/shared/mobile-ui';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const INTERVALS: NotificationPreferences['intervalMinutes'][] = [15, 30, 60];

export function Notifications() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    api.notifications
      .get()
      .then((res) => setPrefs(res.preferences))
      .catch((caught) => setError(caught instanceof ApiRequestError ? caught.message : 'Could not load notification settings.'));
  }, []);

  const save = async (updates: Partial<NotificationPreferences>) => {
    if (updates.backgroundChecks && isNative) {
      try {
        const { granted } = await nativeAppPrefs.requestNotificationPermission();
        if (!granted) {
          toast.error('Notifications are blocked for this app — allow them in Android settings first.');
          return;
        }
      } catch {
        toast.error('Could not request notification permission.');
        return;
      }
    }

    const previous = prefs;
    setPrefs((current) => (current ? { ...current, ...updates } : current));
    try {
      const res = await api.notifications.update(updates);
      setPrefs(res.preferences);
    } catch (caught) {
      setPrefs(previous);
      toast.error(caught instanceof ApiRequestError ? caught.message : 'Failed to save notification settings');
    }
  };

  return (
    <div>
      <PageHeader eyebrow="App" title="Notifications" description="Choose when this app alerts you about your network." />

      {error && <ErrorState message={error} />}
      {!prefs && !error && <LoadingState rows={4} />}

      {!isNative && (
        <InlineNotice tone="warning" title="Android only">
          Background checks and push alerts run on your phone. This screen previews the setting, but it has no effect in a browser.
        </InlineNotice>
      )}

      {prefs && (
        <div className="mt-6 space-y-7">
          <div>
            <SectionTitle>Alerts</SectionTitle>
            <Surface>
              <ToggleRow
                title="New devices"
                detail="Notify when an unrecognised device joins your network"
                checked={prefs.newDevices}
                onChange={(value) => save({ newDevices: value })}
              />
              <ToggleRow
                title="Router offline"
                detail="Notify when this app can't reach your router"
                checked={prefs.routerOffline}
                onChange={(value) => save({ routerOffline: value })}
              />
            </Surface>
          </div>

          <div>
            <SectionTitle>Background checks</SectionTitle>
            <Surface>
              <ToggleRow
                title="Check periodically"
                detail="Look for new devices and router status while the app is closed"
                checked={prefs.backgroundChecks}
                onChange={(value) => save({ backgroundChecks: value })}
              />
              {prefs.backgroundChecks && (
                <div className="flex min-h-16 items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 text-sm font-semibold">Check every</span>
                  <div role="radiogroup" aria-label="Check interval" className="flex gap-1 rounded-full border p-1">
                    {INTERVALS.map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        role="radio"
                        aria-checked={prefs.intervalMinutes === minutes}
                        onClick={() => save({ intervalMinutes: minutes })}
                        className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${prefs.intervalMinutes === minutes ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Surface>
            <p className="mt-3 px-1 text-xs leading-5 text-muted-foreground">
              Checks only run while your phone is connected to a network where the router is reachable, and never use your location.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = `toggle-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <Label htmlFor={id} className="text-[0.9375rem] font-semibold">{title}</Label>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{detail}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

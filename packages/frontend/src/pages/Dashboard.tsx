import { useEffect, useState } from 'react';
import { Activity, ArrowRight, CircleCheck, CircleX, Clock3, Cpu, Router, ShieldCheck, Smartphone, Users, Wifi } from 'lucide-react';
import { Link } from 'react-router';
import type { DashboardResponse, DeviceEvent, DeviceGroup, ManagedDevice, WlanBand } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader, SectionTitle, StatusPill, Surface } from '@/components/shared/mobile-ui';
import { useCapabilities } from '@/context/CapabilitiesContext';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

interface HomeData {
  dashboard: DashboardResponse;
  devices: ManagedDevice[];
  bands: WlanBand[];
  profiles: DeviceGroup[];
  events: DeviceEvent[];
}

export function Dashboard() {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { compatibility } = useCapabilities();

  const load = () => {
    setError(null);
    Promise.all([api.dashboard(), api.devices.list(), api.wifi.get(), api.groups.list(), api.devices.events()])
      .then(([dashboard, devices, wifi, groups, events]) => setData({ dashboard, devices: devices.devices, bands: wifi.bands, profiles: groups.groups, events: events.events }))
      .catch((caught) => setError(caught instanceof ApiRequestError ? caught.message : caught instanceof Error ? caught.message : 'Could not load your network.'));
  };

  useEffect(load, []);

  return (
    <div>
      <PageHeader eyebrow="Your network" title="Home" description="A direct, private view of your Hyperoptic home network." />
      {error && <ErrorState message={error} />}
      {!data && !error && <LoadingState rows={6} />}
      {data && (
        <div className="space-y-7">
          <Surface className="m3-status-enter bg-primary-container p-5 text-primary-container-foreground sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-[20px] bg-primary text-primary-foreground">
                {data.dashboard.wan.connected ? <CircleCheck aria-hidden="true" className="size-7" /> : <CircleX aria-hidden="true" className="size-7" />}
              </span>
              <div className="min-w-0 flex-1">
                <StatusPill state={data.dashboard.wan.connected ? 'success' : 'error'}>{data.dashboard.wan.connected ? 'Internet online' : 'Internet offline'}</StatusPill>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">{data.dashboard.wan.connected ? 'Everything looks connected' : 'Your router needs attention'}</h2>
                <p className="mt-1 text-sm text-primary-container-foreground/80">{data.dashboard.wan.connected ? `${data.devices.filter((item) => item.active).length} devices online · ${data.dashboard.wan.type || 'Hyperoptic WAN'}` : 'Run Network Check for a guided diagnosis.'}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-primary-container-foreground/15 pt-4 text-center">
              <Metric label="Online" value={String(data.devices.filter((item) => item.active).length)} />
              <Metric label="Uptime" value={formatUptime(data.dashboard.system.upTimeSeconds)} />
              <Metric label="Profiles" value={String(data.profiles.length)} />
            </div>
          </Surface>

          <div>
            <SectionTitle>Quick actions</SectionTitle>
            <Surface className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4">
              <QuickAction to="/devices" icon={Smartphone} label="Devices" detail="See who is online" />
              <QuickAction to="/settings/wifi" icon={Wifi} label="Wi-Fi" detail="Names and passwords" />
              <QuickAction to="/settings/profiles" icon={Users} label="Profiles" detail="Organise your home" />
              <QuickAction to="/settings/diagnostics" icon={ShieldCheck} label="Network check" detail="Test connectivity" />
            </Surface>
          </div>

          <div className="grid gap-7 lg:grid-cols-2">
            <div>
              <SectionTitle action={<Link to="/settings/wifi" className="inline-flex min-h-12 items-center text-sm font-semibold text-primary">Manage <ArrowRight aria-hidden="true" className="ml-1 size-4" /></Link>}>Wi-Fi</SectionTitle>
              <Surface>
                {data.bands.slice(0, 3).map((band) => (
                  <div key={band.index} className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-0">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Wifi aria-hidden="true" className="size-5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{band.ssid}</p><p className="text-xs text-muted-foreground">{band.band} · Channel {band.channel || 'Auto'}</p></div>
                    <StatusPill state={band.enabled ? 'success' : 'neutral'}>{band.enabled ? 'On' : 'Off'}</StatusPill>
                  </div>
                ))}
              </Surface>
            </div>

            <div>
              <SectionTitle action={<Link to="/activity" className="inline-flex min-h-12 items-center text-sm font-semibold text-primary">View all <ArrowRight aria-hidden="true" className="ml-1 size-4" /></Link>}>Recent activity</SectionTitle>
              <Surface>
                {data.events.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">Activity will appear as devices connect and settings change.</div> : data.events.slice(0, 4).map((event) => (
                  <div key={event.id} className="flex min-h-16 items-center gap-3 border-b px-4 py-3 last:border-0">
                    <span className="grid size-10 place-items-center rounded-xl bg-secondary"><Activity aria-hidden="true" className="size-5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{event.displayName}</p><p className="truncate text-xs text-muted-foreground">{event.detail || event.eventType.replaceAll('_', ' ')}</p></div>
                    <span className="text-xs font-semibold text-muted-foreground">{relativeTime(event.occurredAt)}</span>
                  </div>
                ))}
              </Surface>
            </div>
          </div>

          <div>
            <SectionTitle>Router health</SectionTitle>
            <Surface className="grid sm:grid-cols-2">
              <InfoRow icon={Router} label="Router" value={data.dashboard.system.modelName} />
              <InfoRow icon={Cpu} label="Firmware" value={data.dashboard.system.softwareVersion} />
              <InfoRow icon={Clock3} label="Uptime" value={formatUptime(data.dashboard.system.upTimeSeconds)} />
              <InfoRow icon={ShieldCheck} label="Protocol" value={compatibility?.supportLevel === 'verified' ? 'Verified' : compatibility?.supportLevel ?? 'Checking'} />
            </Surface>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-lg font-bold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function QuickAction({ to, icon: Icon, label, detail }: { to: string; icon: typeof Smartphone; label: string; detail: string }) {
  return <Link to={to} className="group flex min-h-20 items-center gap-3 border-b border-outline-variant px-4 py-3 transition-colors duration-150 hover:bg-on-surface/8 active:bg-on-surface/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring min-[380px]:odd:border-r min-[380px]:[&:nth-last-child(-n+2)]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary-container text-secondary-container-foreground"><Icon aria-hidden="true" className="size-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs leading-4 text-on-surface-variant">{detail}</span></span></Link>;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Router; label: string; value: string }) {
  return <div className="flex min-h-16 items-center gap-3 border-b px-4 py-3 sm:[&:nth-child(odd)]:border-r"><Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" /><span className="text-sm text-muted-foreground">{label}</span><span className="ml-auto truncate text-sm font-semibold">{value || 'Not reported'}</span></div>;
}

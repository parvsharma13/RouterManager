import { useEffect, useMemo, useState } from 'react';
import { Cable, ChevronRight, Search, Signal, Smartphone, Sparkles, UserRound, Wifi } from 'lucide-react';
import { Link } from 'react-router';
import type { DeviceGroup, ManagedDevice } from '@router-manager/shared';
import { api, ApiRequestError } from '@/lib/api-client';
import { DeviceGlyph } from '@/components/shared/DeviceGlyph';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHeader, StatusPill, Surface } from '@/components/shared/mobile-ui';

type Filter = 'all' | 'online' | 'offline' | 'wifi' | 'ethernet' | 'new';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'Offline' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'ethernet', label: 'Ethernet' },
  { key: 'new', label: 'New' },
];

export function Devices() {
  const [devices, setDevices] = useState<ManagedDevice[] | null>(null);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [profile, setProfile] = useState<number | 'all'>('all');

  useEffect(() => {
    Promise.all([api.devices.list(), api.groups.list()])
      .then(([deviceResult, groupResult]) => { setDevices(deviceResult.devices); setGroups(groupResult.groups); })
      .catch((caught) => setError(caught instanceof ApiRequestError ? caught.message : 'Could not load devices.'));
  }, []);

  const visible = useMemo(() => {
    if (!devices) return [];
    const term = query.trim().toLowerCase();
    return devices.filter((device) => {
      const matchesQuery = !term || [device.displayName, device.hostName, device.ipAddress, device.macAddress].some((value) => value.toLowerCase().includes(term));
      const connection = `${device.connectionType} ${device.interfaceType}`.toLowerCase();
      const matchesFilter = filter === 'all' || (filter === 'online' && device.active) || (filter === 'offline' && !device.active) || (filter === 'wifi' && connection.includes('wi-fi')) || (filter === 'ethernet' && connection.includes('ethernet')) || (filter === 'new' && device.isNew);
      return matchesQuery && matchesFilter && (profile === 'all' || device.groupId === profile);
    }).sort((a, b) => Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName));
  }, [devices, filter, profile, query]);

  const online = devices?.filter((device) => device.active).length ?? 0;

  return (
    <div>
      <PageHeader title="Devices" eyebrow="Household" description={devices ? `${online} online · ${devices.length - online} offline` : 'Devices connected to your router'} />
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search devices" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, IP or MAC" className="pl-12" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Device filters">
          {filters.map((item) => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)} className={cn('m3-nav-destination min-h-12 shrink-0 rounded-xl border border-outline-variant px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', filter === item.key ? 'border-secondary-container bg-secondary-container text-secondary-container-foreground' : 'bg-transparent text-on-surface-variant hover:bg-on-surface/8 hover:text-foreground')}>{item.label}</button>)}
          {groups.length > 0 && <select aria-label="Filter by profile" value={profile} onChange={(event) => setProfile(event.target.value === 'all' ? 'all' : Number(event.target.value))} className="min-h-12 shrink-0 rounded-xl border border-outline-variant bg-transparent px-4 text-sm font-semibold text-on-surface-variant outline-none focus:ring-2 focus:ring-ring"><option value="all">All profiles</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>}
        </div>
      </div>

      {error && <ErrorState message={error} />}
      {!devices && !error && <LoadingState rows={6} />}
      {devices && visible.length === 0 && <Surface className="p-8 text-center"><Smartphone aria-hidden="true" className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 font-semibold">No matching devices</p><p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p></Surface>}
      {devices && visible.length > 0 && (
        <Surface>
          {visible.map((device) => <DeviceRow key={device.macAddress} device={device} profileName={groups.find((group) => group.id === device.groupId)?.name} />)}
        </Surface>
      )}
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Device names and notes stay encrypted on this phone. Router-reported addresses remain on your local network.</p>
    </div>
  );
}

function DeviceRow({ device, profileName }: { device: ManagedDevice; profileName?: string }) {
  const connection = `${device.connectionType || device.interfaceType}`.toLowerCase();
  const ConnectionIcon = connection.includes('ethernet') ? Cable : Wifi;
  return (
    <Link to={`/devices/${encodeURIComponent(device.macAddress)}`} className="flex min-h-[76px] items-center gap-3 border-b border-outline-variant px-4 py-3 transition-colors duration-150 last:border-0 hover:bg-on-surface/8 active:bg-on-surface/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary-container text-secondary-container-foreground">
        <DeviceGlyph icon={device.icon} aria-hidden="true" className="size-5" />
        <span className={cn('absolute bottom-0 right-0 size-3 rounded-full border-2 border-card', device.active ? 'bg-success' : 'bg-muted-foreground/45')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2"><span className="truncate font-semibold">{device.displayName}</span>{device.isNew && <Sparkles aria-label="New device" className="size-4 shrink-0 text-primary" />}</span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><ConnectionIcon aria-hidden="true" className="size-3.5" />{device.connectionType || device.interfaceType || 'Unknown connection'}{profileName && <><span aria-hidden="true">·</span><UserRound aria-hidden="true" className="size-3.5" />{profileName}</>}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {device.signalStrength !== null && device.active && <span className="hidden items-center gap-1 text-xs text-muted-foreground min-[390px]:flex"><Signal aria-hidden="true" className="size-3.5" />{device.signalStrength}</span>}
        <StatusPill state={device.active ? 'success' : 'neutral'}>{device.active ? 'Online' : 'Offline'}</StatusPill>
        <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground/60" />
      </span>
    </Link>
  );
}

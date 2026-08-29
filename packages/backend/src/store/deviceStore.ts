import type { DeviceIcon } from '@router-manager/shared';
import { db } from './db.js';
import { recordEvent } from './eventStore.js';

export interface DeviceOverlayRow {
  macAddress: string;
  customName: string | null;
  icon: DeviceIcon | null;
  notes: string | null;
  groupId: number | null;
}

interface OverlayRow {
  mac_address: string;
  custom_name: string | null;
  icon: string | null;
  notes: string | null;
  group_id: number | null;
}

function toOverlay(row: OverlayRow): DeviceOverlayRow {
  return {
    macAddress: row.mac_address,
    customName: row.custom_name,
    icon: (row.icon as DeviceIcon | null) ?? null,
    notes: row.notes,
    groupId: row.group_id,
  };
}

export function listOverlays(): Map<string, DeviceOverlayRow> {
  const rows = db.prepare('SELECT * FROM devices').all() as OverlayRow[];
  return new Map(rows.map((r) => [r.mac_address, toOverlay(r)]));
}

export function getOverlay(macAddress: string): DeviceOverlayRow | null {
  const row = db.prepare('SELECT * FROM devices WHERE mac_address = ?').get(macAddress) as OverlayRow | undefined;
  return row ? toOverlay(row) : null;
}

export function upsertOverlay(
  macAddress: string,
  updates: { customName?: string | null; icon?: DeviceIcon | null; notes?: string | null; groupId?: number | null }
): DeviceOverlayRow {
  const existing = getOverlay(macAddress);
  const now = new Date().toISOString();
  const customName = updates.customName !== undefined ? updates.customName : (existing?.customName ?? null);
  const icon = updates.icon !== undefined ? updates.icon : (existing?.icon ?? null);
  const notes = updates.notes !== undefined ? updates.notes : (existing?.notes ?? null);
  const groupId = updates.groupId !== undefined ? updates.groupId : (existing?.groupId ?? null);

  db.prepare(
    `INSERT INTO devices (mac_address, custom_name, icon, notes, group_id, created_at, updated_at)
     VALUES (@mac, @customName, @icon, @notes, @groupId, @now, @now)
     ON CONFLICT(mac_address) DO UPDATE SET
       custom_name = @customName, icon = @icon, notes = @notes, group_id = @groupId, updated_at = @now`
  ).run({ mac: macAddress, customName, icon, notes, groupId, now });

  return getOverlay(macAddress)!;
}

export function listDeviceMacsInGroup(groupId: number): string[] {
  const rows = db.prepare('SELECT mac_address FROM devices WHERE group_id = ?').all(groupId) as {
    mac_address: string;
  }[];
  return rows.map((r) => r.mac_address);
}

export function clearGroupFromDevices(groupId: number): void {
  db.prepare('UPDATE devices SET group_id = NULL WHERE group_id = ?').run(groupId);
}

// --- New-device detection, join history & online/offline transitions ---
// Called opportunistically whenever /api/devices is fetched — no background loop needed,
// consistent with the app's on-demand design. Returns whether this MAC was seen for the
// first time by this app (i.e. genuinely new), and logs a device_events row for a first
// sighting or an active-state flip since the last fetch.
export function markSeen(
  macAddress: string,
  displayName: string,
  active: boolean
): { isNew: boolean; firstSeenAt: string; lastSeenAt: string } {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT first_seen_at, active FROM seen_devices WHERE mac_address = ?').get(macAddress) as
    | { first_seen_at: string; active: number }
    | undefined;

  if (existing) {
    db.prepare('UPDATE seen_devices SET last_seen_at = ?, active = ? WHERE mac_address = ?').run(now, active ? 1 : 0, macAddress);
    if (Boolean(existing.active) !== active) {
      recordEvent({ macAddress, displayName, eventType: active ? 'device_online' : 'device_offline', occurredAt: now });
    }
    return { isNew: false, firstSeenAt: existing.first_seen_at, lastSeenAt: now };
  }

  db.prepare('INSERT INTO seen_devices (mac_address, first_seen_at, last_seen_at, active) VALUES (?, ?, ?, ?)').run(
    macAddress,
    now,
    now,
    active ? 1 : 0
  );
  recordEvent({ macAddress, displayName, eventType: 'new_device', occurredAt: now });
  return { isNew: true, firstSeenAt: now, lastSeenAt: now };
}

export function getSeen(macAddress: string): { firstSeenAt: string; lastSeenAt: string } | null {
  const row = db.prepare('SELECT first_seen_at, last_seen_at FROM seen_devices WHERE mac_address = ?').get(
    macAddress
  ) as { first_seen_at: string; last_seen_at: string } | undefined;
  return row ? { firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at } : null;
}

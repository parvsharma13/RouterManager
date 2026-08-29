import type { DeviceEvent } from '@router-manager/shared';
import { db } from './db.js';

interface EventRow {
  id: number;
  mac_address: string | null;
  display_name: string;
  event_type: string;
  occurred_at: string;
  detail: string | null;
}

function toEvent(row: EventRow): DeviceEvent {
  return {
    id: row.id,
    macAddress: row.mac_address,
    displayName: row.display_name,
    eventType: row.event_type as DeviceEvent['eventType'],
    occurredAt: row.occurred_at,
    detail: row.detail,
  };
}

export function listRecentEvents(limit = 100): DeviceEvent[] {
  const rows = db.prepare('SELECT * FROM device_events ORDER BY occurred_at DESC LIMIT ?').all(limit) as EventRow[];
  return rows.map(toEvent);
}

export function recordEvent(event: {
  macAddress?: string | null;
  displayName: string;
  eventType: DeviceEvent['eventType'];
  detail?: string | null;
  occurredAt?: string;
}): DeviceEvent {
  const occurredAt = event.occurredAt ?? new Date().toISOString();
  const result = db
    .prepare(
      'INSERT INTO device_events (mac_address, display_name, event_type, occurred_at, detail) VALUES (?, ?, ?, ?, ?)'
    )
    .run(event.macAddress ?? null, event.displayName, event.eventType, occurredAt, event.detail ?? null);
  return {
    id: Number(result.lastInsertRowid),
    macAddress: event.macAddress ?? null,
    displayName: event.displayName,
    eventType: event.eventType,
    occurredAt,
    detail: event.detail ?? null,
  };
}

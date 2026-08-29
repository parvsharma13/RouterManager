import type { NotificationPreferences } from '@router-manager/shared';
import { db } from './db.js';

interface PrefsRow {
  new_devices: number;
  router_offline: number;
  background_checks: number;
  interval_minutes: number;
}

const DEFAULTS: NotificationPreferences = {
  newDevices: true,
  routerOffline: true,
  backgroundChecks: false,
  intervalMinutes: 30,
};

function toPreferences(row: PrefsRow): NotificationPreferences {
  return {
    newDevices: Boolean(row.new_devices),
    routerOffline: Boolean(row.router_offline),
    backgroundChecks: Boolean(row.background_checks),
    intervalMinutes: row.interval_minutes as NotificationPreferences['intervalMinutes'],
  };
}

export function getNotificationPreferences(): NotificationPreferences {
  const row = db.prepare('SELECT * FROM notification_prefs WHERE id = 1').get() as PrefsRow | undefined;
  return row ? toPreferences(row) : DEFAULTS;
}

export function updateNotificationPreferences(updates: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getNotificationPreferences();
  const next = { ...current, ...updates };
  db.prepare(
    `INSERT INTO notification_prefs (id, new_devices, router_offline, background_checks, interval_minutes)
     VALUES (1, @newDevices, @routerOffline, @backgroundChecks, @intervalMinutes)
     ON CONFLICT(id) DO UPDATE SET
       new_devices = @newDevices, router_offline = @routerOffline,
       background_checks = @backgroundChecks, interval_minutes = @intervalMinutes`
  ).run({
    newDevices: next.newDevices ? 1 : 0,
    routerOffline: next.routerOffline ? 1 : 0,
    backgroundChecks: next.backgroundChecks ? 1 : 0,
    intervalMinutes: next.intervalMinutes,
  });
  return next;
}

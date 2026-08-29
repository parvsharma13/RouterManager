import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { DeviceEvent, DeviceGroup, DeviceOverlay, DiagnosticsResult, NotificationPreferences, Policy } from '@router-manager/shared';

const LEGACY_KEY = 'router-manager-local-data-v1';
const WEB_KEY = 'router-manager-local-data-v2';
const DATABASE = 'router-manager';

export interface SeenDevice { firstSeenAt: string; lastSeenAt: string; name: string; active?: boolean; }
export interface LocalData {
  overlays: Record<string, DeviceOverlay>;
  seen: Record<string, SeenDevice>;
  groups: DeviceGroup[];
  policies: Policy[];
  events: DeviceEvent[];
  diagnostics: DiagnosticsResult[];
  notifications: NotificationPreferences;
  nextId: number;
}

const defaults = (): LocalData => ({
  overlays: {}, seen: {}, groups: [], policies: [], events: [], diagnostics: [],
  notifications: { newDevices: true, routerOffline: true, backgroundChecks: false, intervalMinutes: 30 }, nextId: 1,
});

let connectionPromise: Promise<SQLiteDBConnection> | null = null;
let mutationQueue: Promise<unknown> = Promise.resolve();

async function openDatabase(): Promise<SQLiteDBConnection> {
  if (connectionPromise) return connectionPromise;
  connectionPromise = (async () => {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const secretStored = await sqlite.isSecretStored();
    if (!secretStored.result) {
      const key = new Uint8Array(32); crypto.getRandomValues(key);
      await sqlite.setEncryptionSecret(Array.from(key, (value) => value.toString(16).padStart(2, '0')).join(''));
    }
    const db = await sqlite.createConnection(DATABASE, true, 'secret', 1, false);
    await db.open();
    await db.execute(`
      CREATE TABLE IF NOT EXISTS overlays (mac TEXT PRIMARY KEY, custom_name TEXT, icon TEXT, notes TEXT, group_id INTEGER);
      CREATE TABLE IF NOT EXISTS seen_devices (mac TEXT PRIMARY KEY, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY, name TEXT NOT NULL, icon TEXT, device_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS policies (id INTEGER PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, mac TEXT, display_name TEXT NOT NULL, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL, detail TEXT);
      CREATE TABLE IF NOT EXISTS diagnostics (checked_at TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    await migrateLegacy(db);
    return db;
  })();
  return connectionPromise;
}

async function migrateLegacy(db: SQLiteDBConnection): Promise<void> {
  const migrated = await db.query("SELECT value FROM settings WHERE key='legacy_migrated'");
  if (migrated.values?.length) return;
  const raw = await SecureStorage.getItem(LEGACY_KEY);
  if (raw) {
    try { await persist(db, { ...defaults(), ...(JSON.parse(raw) as Partial<LocalData>) }); await SecureStorage.removeItem(LEGACY_KEY); } catch { /* Preserve unreadable legacy data. */ }
  }
  await db.run("INSERT OR REPLACE INTO settings(key,value) VALUES('legacy_migrated','1')");
}

function readWeb(): LocalData {
  const raw = localStorage.getItem(WEB_KEY); if (!raw) return defaults();
  try { return { ...defaults(), ...(JSON.parse(raw) as Partial<LocalData>) }; } catch { return defaults(); }
}

export async function readLocal(): Promise<LocalData> {
  if (!Capacitor.isNativePlatform()) return readWeb();
  const db = await openDatabase();
  const [overlays, seen, groups, policies, events, diagnostics, settings] = await Promise.all([
    db.query('SELECT * FROM overlays'), db.query('SELECT * FROM seen_devices'), db.query('SELECT * FROM profiles ORDER BY created_at'),
    db.query('SELECT payload FROM policies ORDER BY id'), db.query('SELECT * FROM events ORDER BY occurred_at DESC LIMIT 500'),
    db.query('SELECT payload FROM diagnostics ORDER BY checked_at DESC LIMIT 50'), db.query("SELECT key,value FROM settings WHERE key IN ('notifications','next_id')"),
  ]);
  const data = defaults();
  for (const row of overlays.values ?? []) data.overlays[row.mac] = { macAddress: row.mac, customName: row.custom_name, icon: row.icon, notes: row.notes, groupId: row.group_id };
  for (const row of seen.values ?? []) data.seen[row.mac] = { firstSeenAt: row.first_seen, lastSeenAt: row.last_seen, name: row.name, active: Boolean(row.active) };
  data.groups = (groups.values ?? []).map((row) => ({ id: row.id, name: row.name, icon: row.icon, deviceCount: row.device_count, createdAt: row.created_at, updatedAt: row.updated_at }));
  data.policies = (policies.values ?? []).map((row) => JSON.parse(row.payload));
  data.events = (events.values ?? []).map((row) => ({ id: row.id, macAddress: row.mac, displayName: row.display_name, eventType: row.event_type, occurredAt: row.occurred_at, detail: row.detail }));
  data.diagnostics = (diagnostics.values ?? []).map((row) => JSON.parse(row.payload));
  for (const row of settings.values ?? []) { if (row.key === 'notifications') data.notifications = { ...data.notifications, ...JSON.parse(row.value) }; if (row.key === 'next_id') data.nextId = Number(row.value) || 1; }
  return data;
}

async function persist(db: SQLiteDBConnection, data: LocalData): Promise<void> {
  await db.beginTransaction();
  try {
    await db.execute('DELETE FROM overlays; DELETE FROM seen_devices; DELETE FROM profiles; DELETE FROM policies; DELETE FROM events; DELETE FROM diagnostics;');
    for (const item of Object.values(data.overlays)) await db.run('INSERT INTO overlays(mac,custom_name,icon,notes,group_id) VALUES(?,?,?,?,?)', [item.macAddress, item.customName, item.icon, item.notes, item.groupId]);
    for (const [mac, item] of Object.entries(data.seen)) await db.run('INSERT INTO seen_devices(mac,first_seen,last_seen,name,active) VALUES(?,?,?,?,?)', [mac, item.firstSeenAt, item.lastSeenAt, item.name, item.active ? 1 : 0]);
    for (const item of data.groups) await db.run('INSERT INTO profiles(id,name,icon,device_count,created_at,updated_at) VALUES(?,?,?,?,?,?)', [item.id, item.name, item.icon, item.deviceCount, item.createdAt, item.updatedAt]);
    for (const item of data.policies) await db.run('INSERT INTO policies(id,payload) VALUES(?,?)', [item.id, JSON.stringify(item)]);
    for (const item of data.events.slice(0, 500)) await db.run('INSERT INTO events(id,mac,display_name,event_type,occurred_at,detail) VALUES(?,?,?,?,?,?)', [item.id, item.macAddress, item.displayName, item.eventType, item.occurredAt, item.detail ?? null]);
    for (const item of data.diagnostics.slice(0, 50)) await db.run('INSERT INTO diagnostics(checked_at,payload) VALUES(?,?)', [item.checkedAt, JSON.stringify(item)]);
    await db.run("INSERT OR REPLACE INTO settings(key,value) VALUES('notifications',?)", [JSON.stringify(data.notifications)]);
    await db.run("INSERT OR REPLACE INTO settings(key,value) VALUES('next_id',?)", [String(data.nextId)]);
    await db.commitTransaction();
  } catch (error) { await db.rollbackTransaction(); throw error; }
}

export async function writeLocal(data: LocalData): Promise<void> {
  if (!Capacitor.isNativePlatform()) { localStorage.setItem(WEB_KEY, JSON.stringify(data)); return; }
  await persist(await openDatabase(), data);
}

export async function updateLocal<T>(fn: (data: LocalData) => T | Promise<T>): Promise<T> {
  let result!: T;
  mutationQueue = mutationQueue.then(async () => { const data = await readLocal(); result = await fn(data); await writeLocal(data); });
  await mutationQueue; return result;
}

export async function appendEvent(event: Omit<DeviceEvent, 'id' | 'occurredAt'> & { occurredAt?: string }): Promise<void> {
  await updateLocal((data) => { data.events.unshift({ ...event, id: data.nextId++, occurredAt: event.occurredAt ?? new Date().toISOString() }); });
}

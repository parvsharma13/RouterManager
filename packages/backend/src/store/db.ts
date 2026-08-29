import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

// App-owned data (device nicknames/icons, groups, policies, join history) has no home on
// the router itself. See packages/shared/src/types/app-data.ts. Same "single embedded
// file, gitignored" precedent as config/credentials.ts' .router-config.json.
const backendRoot = path.resolve(fileURLToPath(import.meta.url), '../../..');
const dataDir = path.join(backendRoot, 'data');
const dbPath = path.join(dataDir, 'app.db');

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS devices (
    mac_address TEXT PRIMARY KEY,
    custom_name TEXT,
    icon TEXT,
    notes TEXT,
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL CHECK (target_type IN ('device','group')),
    target_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pause','schedule')),
    days TEXT,
    start_time TEXT,
    end_time TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    enforcement TEXT NOT NULL DEFAULT 'unenforced' CHECK (enforcement IN ('native','unenforced')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(target_type, target_id, type)
  );

  CREATE TABLE IF NOT EXISTS seen_devices (
    mac_address TEXT PRIMARY KEY,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS device_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mac_address TEXT,
    display_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    detail TEXT
  );

  CREATE TABLE IF NOT EXISTS notification_prefs (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    new_devices INTEGER NOT NULL DEFAULT 1,
    router_offline INTEGER NOT NULL DEFAULT 1,
    background_checks INTEGER NOT NULL DEFAULT 0,
    interval_minutes INTEGER NOT NULL DEFAULT 30
  );
`);

// device_events predates the `detail` column and the switch from a required mac_address
// to an optional one (some events, like a network-wide diagnostic result, aren't tied to
// a specific device); add both defensively for a database file created before this change.
for (const statement of [
  "ALTER TABLE device_events ADD COLUMN detail TEXT",
  "ALTER TABLE seen_devices ADD COLUMN active INTEGER NOT NULL DEFAULT 0",
]) {
  try {
    db.exec(statement);
  } catch (err) {
    if (!(err instanceof Error) || !/duplicate column/i.test(err.message)) throw err;
  }
}

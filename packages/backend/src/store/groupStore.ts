import type { DeviceGroup, DeviceIcon } from '@router-manager/shared';
import { db } from './db.js';

interface GroupRow {
  id: number;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
  device_count: number;
}

const SELECT_WITH_COUNT = `
  SELECT g.id, g.name, g.icon, g.created_at, g.updated_at,
         (SELECT COUNT(*) FROM devices d WHERE d.group_id = g.id) AS device_count
  FROM groups g
`;

function toGroup(row: GroupRow): DeviceGroup {
  return {
    id: row.id,
    name: row.name,
    icon: (row.icon as DeviceIcon | null) ?? null,
    deviceCount: row.device_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listGroups(): DeviceGroup[] {
  const rows = db.prepare(`${SELECT_WITH_COUNT} ORDER BY g.name COLLATE NOCASE`).all() as GroupRow[];
  return rows.map(toGroup);
}

export function getGroup(id: number): DeviceGroup | null {
  const row = db.prepare(`${SELECT_WITH_COUNT} WHERE g.id = ?`).get(id) as GroupRow | undefined;
  return row ? toGroup(row) : null;
}

export function createGroup(name: string, icon: DeviceIcon | null): DeviceGroup {
  const now = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO groups (name, icon, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(name, icon, now, now);
  return getGroup(Number(result.lastInsertRowid))!;
}

export function updateGroup(id: number, updates: { name?: string; icon?: DeviceIcon | null }): DeviceGroup | null {
  const existing = getGroup(id);
  if (!existing) return null;
  const name = updates.name ?? existing.name;
  const icon = updates.icon !== undefined ? updates.icon : existing.icon;
  db.prepare('UPDATE groups SET name = ?, icon = ?, updated_at = ? WHERE id = ?').run(
    name,
    icon,
    new Date().toISOString(),
    id
  );
  return getGroup(id);
}

export function deleteGroup(id: number): boolean {
  const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id);
  return result.changes > 0;
}

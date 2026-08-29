import type { Policy, PolicyTargetType } from '@router-manager/shared';
import { db } from './db.js';

export class PolicyConflictError extends Error {
  constructor(targetType: string, targetId: string, type: string) {
    super(`A "${type}" policy already exists for ${targetType} "${targetId}". Update or delete it instead.`);
    this.name = 'PolicyConflictError';
  }
}

interface PolicyRow {
  id: number;
  target_type: string;
  target_id: string;
  type: string;
  days: string | null;
  start_time: string | null;
  end_time: string | null;
  enabled: number;
  enforcement: string;
  created_at: string;
  updated_at: string;
}

function toPolicy(row: PolicyRow): Policy {
  const base = {
    id: row.id,
    targetType: row.target_type as PolicyTargetType,
    targetId: row.target_id,
    enabled: row.enabled === 1,
    enforcement: row.enforcement as 'native' | 'unenforced',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.type === 'schedule') {
    return {
      ...base,
      type: 'schedule',
      days: JSON.parse(row.days ?? '[]'),
      startTime: row.start_time ?? '00:00',
      endTime: row.end_time ?? '00:00',
    };
  }
  return { ...base, type: 'pause' };
}

export function listPolicies(): Policy[] {
  const rows = db.prepare('SELECT * FROM policies ORDER BY created_at DESC').all() as PolicyRow[];
  return rows.map(toPolicy);
}

export function listEnabledPolicies(): Policy[] {
  const rows = db.prepare('SELECT * FROM policies WHERE enabled = 1').all() as PolicyRow[];
  return rows.map(toPolicy);
}

export function getPolicy(id: number): Policy | null {
  const row = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as PolicyRow | undefined;
  return row ? toPolicy(row) : null;
}

export type CreatePolicyInput =
  | { targetType: PolicyTargetType; targetId: string; type: 'pause'; enabled: boolean }
  | {
      targetType: PolicyTargetType;
      targetId: string;
      type: 'schedule';
      days: number[];
      startTime: string;
      endTime: string;
      enabled: boolean;
    };

export function createPolicy(input: CreatePolicyInput): Policy {
  const now = new Date().toISOString();
  try {
    const result = db
      .prepare(
        `INSERT INTO policies (target_type, target_id, type, days, start_time, end_time, enabled, enforcement, created_at, updated_at)
         VALUES (@targetType, @targetId, @type, @days, @startTime, @endTime, @enabled, 'unenforced', @now, @now)`
      )
      .run({
        targetType: input.targetType,
        targetId: input.targetId,
        type: input.type,
        days: input.type === 'schedule' ? JSON.stringify(input.days) : null,
        startTime: input.type === 'schedule' ? input.startTime : null,
        endTime: input.type === 'schedule' ? input.endTime : null,
        enabled: input.enabled ? 1 : 0,
        now,
      });
    return getPolicy(Number(result.lastInsertRowid))!;
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      throw new PolicyConflictError(input.targetType, input.targetId, input.type);
    }
    throw err;
  }
}

export function updatePolicy(
  id: number,
  updates: { enabled?: boolean; days?: number[]; startTime?: string; endTime?: string }
): Policy | null {
  const existing = getPolicy(id);
  if (!existing) return null;
  const enabled = updates.enabled ?? existing.enabled;
  const days = updates.days ?? (existing.type === 'schedule' ? existing.days : []);
  const startTime = updates.startTime ?? (existing.type === 'schedule' ? existing.startTime : '00:00');
  const endTime = updates.endTime ?? (existing.type === 'schedule' ? existing.endTime : '00:00');

  db.prepare(
    `UPDATE policies SET enabled = ?, days = ?, start_time = ?, end_time = ?, updated_at = ? WHERE id = ?`
  ).run(
    enabled ? 1 : 0,
    existing.type === 'schedule' ? JSON.stringify(days) : null,
    existing.type === 'schedule' ? startTime : null,
    existing.type === 'schedule' ? endTime : null,
    new Date().toISOString(),
    id
  );
  return getPolicy(id);
}

export function setEnforcement(id: number, enforcement: 'native' | 'unenforced'): void {
  db.prepare('UPDATE policies SET enforcement = ?, updated_at = ? WHERE id = ?').run(
    enforcement,
    new Date().toISOString(),
    id
  );
}

export function deletePolicy(id: number): boolean {
  const result = db.prepare('DELETE FROM policies WHERE id = ?').run(id);
  return result.changes > 0;
}

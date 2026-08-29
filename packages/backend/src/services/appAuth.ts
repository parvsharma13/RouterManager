import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { routerConfig } from '../router-client/instance.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

interface Session {
  username: string;
  expiresAt: number;
}

interface AttemptWindow {
  count: number;
  resetAt: number;
}

const sessions = new Map<string, Session>();
const attempts = new Map<string, AttemptWindow>();

function constantTimeEqual(left: string, right: string): boolean {
  const leftHash = crypto.createHash('sha256').update(left).digest();
  const rightHash = crypto.createHash('sha256').update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

export function authenticate(username: string, password: string): boolean {
  return constantTimeEqual(username, routerConfig.username) && constantTimeEqual(password, routerConfig.password);
}

export function createSession(username: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { username, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function revokeSession(token: string): void {
  sessions.delete(token);
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= MAX_ATTEMPTS,
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
  };
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}

export function requireAppAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Please sign in again.' });
    return;
  }
  next();
}

export function bearerToken(req: Request): string {
  const header = req.header('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : '';
}

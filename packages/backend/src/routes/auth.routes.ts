import { Router } from 'express';
import { z } from 'zod';
import {
  authenticate,
  bearerToken,
  checkRateLimit,
  clearRateLimit,
  createSession,
  revokeSession,
} from '../services/appAuth.js';

export const authRoutes = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(512),
});

authRoutes.post('/auth/login', (req, res) => {
  const input = loginSchema.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ code: 'INVALID_INPUT', message: 'Enter your username and password.' });
    return;
  }

  const rateKey = req.ip || req.socket.remoteAddress || 'unknown';
  const limit = checkRateLimit(rateKey);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    res.status(429).json({ code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' });
    return;
  }

  const { username, password } = input.data;
  if (!authenticate(username, password)) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'The username or password is incorrect.' });
    return;
  }

  clearRateLimit(rateKey);
  const session = createSession(username);
  res.json({ ...session, user: { username } });
});

authRoutes.post('/auth/logout', (req, res) => {
  revokeSession(bearerToken(req));
  res.json({ ok: true });
});

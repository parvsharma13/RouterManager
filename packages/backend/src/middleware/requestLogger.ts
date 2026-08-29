import type { Request, Response, NextFunction } from 'express';

const REDACT_KEYS = /password|psk|passwd|cookie|authorization|csrftoken/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        REDACT_KEYS.test(k) ? '[redacted]' : redact(v),
      ])
    );
  }
  return value;
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const bodyPreview = req.body && Object.keys(req.body).length ? JSON.stringify(redact(req.body)) : '';
  console.log(`${req.method} ${req.path} ${bodyPreview}`);
  next();
}

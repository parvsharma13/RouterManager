import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { RouterAuthError, RouterUnreachableError, RouterUnsupportedFeatureError } from '../router-client/errors.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof RouterUnreachableError) {
    res.status(503).json({ code: 'ROUTER_UNREACHABLE', message: err.message });
    return;
  }
  if (err instanceof RouterAuthError) {
    res.status(502).json({ code: 'ROUTER_AUTH_FAILED', message: err.message });
    return;
  }
  if (err instanceof RouterUnsupportedFeatureError) {
    res.status(404).json({ code: 'FEATURE_UNSUPPORTED', message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ code: 'INVALID_INPUT', message: err.issues.map((i) => i.message).join('; ') });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error('Unhandled error:', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message });
}

export function asyncRoute<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

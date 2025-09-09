import { Request, Response, NextFunction } from 'express';

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token: any = (req as any).token;
    if (!token) return next(); // If using session auth, skip scope check
    const scopes: string[] = token.scopes || [];
    if (scopes.length === 0 || scopes.includes(scope)) return next();
    return res.status(403).json({ success: false, error: { message: `Missing required scope: ${scope}` } });
  };
}

// Simple in-memory per-token rate limiter (per minute)
const windowMs = 60_000;
const usage: Map<string, { windowStart: number; count: number; limit?: number }> = new Map();

export function rateLimitToken() {
  return (req: Request, res: Response, next: NextFunction) => {
    const token: any = (req as any).token;
    if (!token || !token.id) return next();
    const entry = usage.get(token.id) || { windowStart: Date.now(), count: 0, limit: token.rateLimit };
    const now = Date.now();
    if (now - entry.windowStart > windowMs) {
      entry.windowStart = now;
      entry.count = 0;
    }
    entry.count += 1;
    usage.set(token.id, entry);
    if (entry.limit && entry.count > entry.limit) {
      return res.status(429).json({ success: false, error: { message: 'Rate limit exceeded' } });
    }
    next();
  };
}


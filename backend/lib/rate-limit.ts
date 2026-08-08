import { config } from "./config";

/**
 * Fixed-window in-memory rate limiter, keyed by client IP.
 * Per-instance only — fine for a chat API (each Vercel instance enforces
 * its own window; combined with per-address cost caps this is defense in
 * depth, not the only layer).
 */
export class RateLimiter {
  private windows = new Map<string, { startedAt: number; count: number }>();

  /** Returns true if the request is allowed. Reads the limit live so tests and
   *  runtime config changes apply immediately. */
  allow(key: string, now = Date.now()): boolean {
    const perMinute = Math.max(config.rateLimitPerMinute, 1);
    const windowMs = 60_000;
    const entry = this.windows.get(key);
    if (!entry || now - entry.startedAt >= windowMs) {
      this.windows.set(key, { startedAt: now, count: 1 });
      this.prune(now);
      return true;
    }
    entry.count += 1;
    return entry.count <= perMinute;
  }

  private prune(now: number) {
    if (this.windows.size < 10_000) return;
    for (const [key, entry] of this.windows) {
      if (now - entry.startedAt >= 60_000) this.windows.delete(key);
    }
  }
}

export const rateLimiter = new RateLimiter();

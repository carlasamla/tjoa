/**
 * Simple in-memory cache and per-IP rate limiter for API routes.
 * Prevents duplicate API calls for identical queries and limits
 * how often a single client can hit the Anthropic API.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * In-memory cache with TTL expiration.
 * Caches API responses so identical queries don't hit the Anthropic API again.
 */
export class ResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private ttlMs: number;

  constructor(opts: { maxSize?: number; ttlSeconds?: number } = {}) {
    this.maxSize = opts.maxSize ?? 100;
    this.ttlMs = (opts.ttlSeconds ?? 300) * 1000; // default 5 min
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/**
 * Per-IP rate limiter using a sliding window.
 * Returns true if the request should be allowed, false if rate-limited.
 */
export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private maxRequests: number;
  private windowMs: number;

  constructor(opts: { maxRequests?: number; windowSeconds?: number } = {}) {
    this.maxRequests = opts.maxRequests ?? 5;
    this.windowMs = (opts.windowSeconds ?? 60) * 1000; // default 1 min
  }

  /**
   * Check if the given key (IP) is allowed to make a request.
   * Returns true if allowed, false if rate-limited.
   */
  allow(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.limits.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /** Clean up old entries periodically to prevent memory leaks */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits) {
      if (now - entry.windowStart > this.windowMs) {
        this.limits.delete(key);
      }
    }
  }
}

/**
 * Build a stable cache key from query parameters.
 * Normalizes the query so minor whitespace differences don't create separate entries.
 */
export function buildCacheKey(...parts: (string | number | undefined)[]): string {
  return parts
    .map((p) => String(p ?? "").trim().toLowerCase())
    .join("|");
}

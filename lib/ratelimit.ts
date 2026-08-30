import { Ratelimit } from "@upstash/ratelimit";
import { DEFAULT_RATE_LIMIT, type RateLimitConfig } from "@/lib/config";
import { getRedis } from "@/lib/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the caller may retry; 0 when not limited. */
  retryAfter: number;
}

const ALLOWED: RateLimitResult = {
  success: true,
  limit: 0,
  remaining: 0,
  retryAfter: 0,
};

const limiters = new Map<string, Ratelimit>();

function limiterFor(cfg: RateLimitConfig): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${cfg.requests}:${cfg.window}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        cfg.requests,
        cfg.window as Parameters<typeof Ratelimit.slidingWindow>[1],
      ),
      prefix: "mail:rl",
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

export async function checkRateLimit(
  appId: string,
  cfg: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<RateLimitResult> {
  const limiter = limiterFor(cfg);
  if (!limiter) return ALLOWED;

  const res = await limiter.limit(appId);
  return {
    success: res.success,
    limit: res.limit,
    remaining: res.remaining,
    retryAfter: res.success ? 0 : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
  };
}

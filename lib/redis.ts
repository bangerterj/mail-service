import { Redis } from "@upstash/redis";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

let warned = false;
let client: Redis | null | undefined;

/**
 * Redis is optional. When unset, callers degrade gracefully (rate limiting and
 * the local suppression list no-op) rather than crashing.
 */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  if (!config.redisUrl || !config.redisToken) {
    if (!warned) {
      logger.warn(
        "UPSTASH_REDIS_REST_URL/TOKEN not set: rate limiting and suppression are DISABLED",
      );
      warned = true;
    }
    client = null;
    return client;
  }
  client = new Redis({ url: config.redisUrl, token: config.redisToken });
  return client;
}

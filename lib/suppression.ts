import type { TemplateCategory } from "@/emails";
import { getRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";

/**
 * Two lists, because suppression is category-aware.
 *
 * `ALL_KEY`   — the address is dead (hard bounce). Nothing may be sent to it.
 * `NOTIF_KEY` — the person complained. Notification mail stops; transactional
 *               mail must still go out, or a spam report on a mention email
 *               would lock them out of their own account.
 */
const ALL_KEY = "mail:suppressed:all";
const NOTIF_KEY = "mail:suppressed:notification";

/** Which list an event writes to. */
export type SuppressionScope = "all" | "notification";

function normalize(address: string): string {
  return address.trim().toLowerCase();
}

function keyFor(scope: SuppressionScope): string {
  return scope === "all" ? ALL_KEY : NOTIF_KEY;
}

/** Add an address to a suppression list. No-op when Redis is unconfigured. */
export async function suppress(
  address: string,
  reason: string,
  scope: SuppressionScope = "all",
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const normalized = normalize(address);
  await redis.sadd(keyFor(scope), normalized);
  logger.info("address suppressed", {
    domain: normalized.split("@")[1],
    reason,
    scope,
  });
}

/**
 * True when this address must not receive mail of this category. Transactional
 * mail is only blocked by the `all` list.
 */
export async function isSuppressed(
  address: string,
  category: TemplateCategory = "notification",
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const normalized = normalize(address);
  if ((await redis.sismember(ALL_KEY, normalized)) === 1) return true;
  if (category !== "notification") return false;
  return (await redis.sismember(NOTIF_KEY, normalized)) === 1;
}

/** Returns the subset of `to` that is safe to send this category to. */
export async function filterSuppressed(
  to: string[],
  category: TemplateCategory = "notification",
): Promise<{ allowed: string[]; suppressed: string[] }> {
  const redis = getRedis();
  if (!redis) return { allowed: to, suppressed: [] };

  const flags = await Promise.all(to.map((addr) => isSuppressed(addr, category)));
  const allowed: string[] = [];
  const suppressed: string[] = [];
  to.forEach((addr, i) => (flags[i] ? suppressed : allowed).push(addr));
  return { allowed, suppressed };
}

/** Remove an address from one list, or from both when scope is omitted. */
export async function unsuppress(
  address: string,
  scope?: SuppressionScope,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const normalized = normalize(address);
  const keys = scope ? [keyFor(scope)] : [ALL_KEY, NOTIF_KEY];
  await Promise.all(keys.map((k) => redis.srem(k, normalized)));
}

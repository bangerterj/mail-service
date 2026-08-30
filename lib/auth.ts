import { timingSafeEqual } from "node:crypto";
import type { AppConfig } from "@/lib/config";
import { apps } from "@/lib/config";

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch; compare against a same-length
  // buffer so the comparison itself stays constant time for equal-length keys.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Resolve a bearer token to an app config. Walks every configured key with a
 * constant-time comparison rather than a Map lookup, so response time does not
 * reveal how much of a guessed key was correct.
 */
export function authenticate(
  token: string | null,
  registry: Map<string, AppConfig> = apps,
): AppConfig | null {
  if (!token) return null;
  let found: AppConfig | null = null;
  for (const [key, cfg] of registry) {
    if (constantTimeEquals(key, token)) found = cfg;
  }
  return found;
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { templateNames } from "@/emails";
import { apps, config, providerName } from "@/lib/config";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const credentialsPresent = Boolean(config.accessKeyId && config.secretAccessKey);
  return NextResponse.json({
    status: "ok",
    provider: providerName,
    region: config.region,
    apps: apps.size,
    appIds: Array.from(apps.values()).map((a) => a.appId),
    configurationSets: Object.fromEntries(
      Array.from(apps.values()).map((a) => [a.appId, a.configurationSet ?? null]),
    ),
    /**
     * Per-app allowlists, keyed by a truncated hash of that app's API key.
     *
     * A 403 template_not_allowed is a statement about the app the *key* maps
     * to, and the base URL carries no identity — so without this, both sides
     * can verify their own config correctly and still disagree, because they
     * are talking about different app records. A calling app publishes the same
     * fingerprint of the key it holds; matching them names the app exactly.
     *
     * The fingerprint is a SHA-256 prefix, not a key prefix: this endpoint is
     * unauthenticated, so it must be useless to a reader who does not already
     * hold the secret.
     */
    appDetails: Array.from(apps.values()).map((a) => ({
      appId: a.appId,
      keyFingerprint: createHash("sha256").update(a.key).digest("hex").slice(0, 12),
      templates: a.templates,
      configurationSet: a.configurationSet ?? null,
    })),
    templates: templateNames,
    redis: getRedis() ? "configured" : "disabled",
    webhookSecret: config.webhookSecret ? "configured" : "unset",
    awsCredentials:
      providerName === "console" ? "not required" : credentialsPresent ? "present" : "missing",
    time: new Date().toISOString(),
  });
}

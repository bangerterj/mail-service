import { z } from "zod";
import { templateNames } from "@/emails";

const rateLimitSchema = z.object({
  requests: z.number().int().positive(),
  window: z
    .string()
    .regex(/^\d+\s?(ms|s|m|h|d)$/, "window must look like '1h', '30 m', '500ms'"),
});

const appConfigSchema = z.object({
  appId: z.string().min(1),
  from: z.string().email(),
  fromName: z.string().min(1),
  replyTo: z.string().email().optional(),
  templates: z.array(z.enum(templateNames)).min(1),
  /**
   * SES configuration set name, one per app (convention: the appId). Gives
   * per-app delivery/bounce metrics and CloudWatch alarms without SES Tenants.
   * Optional: the sets may not exist in AWS yet, and sending must work without.
   */
  configurationSet: z.string().min(1).max(64).optional(),
  rateLimit: rateLimitSchema.optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema> & { key: string };
export type RateLimitConfig = z.infer<typeof rateLimitSchema>;

export const DEFAULT_RATE_LIMIT: RateLimitConfig = { requests: 100, window: "1h" };

const appsSchema = z.record(z.string().min(8), appConfigSchema);

function parseApps(raw: string | undefined): Map<string, AppConfig> {
  if (!raw || raw.trim() === "") {
    throw new Error("APPS is required but was empty. See .env.example.");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`APPS is not valid JSON: ${(err as Error).message}`);
  }

  const parsed = appsSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`APPS failed validation: ${JSON.stringify(parsed.error.format())}`);
  }

  const map = new Map<string, AppConfig>();
  const seenAppIds = new Set<string>();
  for (const [key, cfg] of Object.entries(parsed.data)) {
    if (seenAppIds.has(cfg.appId)) {
      throw new Error(`APPS contains duplicate appId "${cfg.appId}"`);
    }
    seenAppIds.add(cfg.appId);
    map.set(key, { ...cfg, key });
  }
  return map;
}

/** Exported for tests; the route uses the module-scope `apps` map. */
export { parseApps };

// Parsed once at module load — fail loud at boot on misconfiguration.
export const apps: Map<string, AppConfig> = parseApps(process.env.APPS);

export const providerName = (process.env.EMAIL_PROVIDER ?? "ses") as "ses" | "console";

/**
 * us-east-1 is fixed: SES identities, production access, and configuration sets
 * are all per-region, and the verified domains live there. See AWS_HANDOFF.md.
 */
export const DEFAULT_REGION = "us-east-1";

export const config = {
  region: process.env.AWS_REGION ?? DEFAULT_REGION,
  accessKeyId: process.env.MAIL_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MAIL_AWS_SECRET_ACCESS_KEY,
  webhookSecret: process.env.SES_WEBHOOK_SECRET,
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
};

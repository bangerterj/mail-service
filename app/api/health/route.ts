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
    templates: templateNames,
    redis: getRedis() ? "configured" : "disabled",
    webhookSecret: config.webhookSecret ? "configured" : "unset",
    awsCredentials:
      providerName === "console" ? "not required" : credentialsPresent ? "present" : "missing",
    time: new Date().toISOString(),
  });
}

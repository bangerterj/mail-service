#!/usr/bin/env tsx
import { SESv2Client, GetEmailIdentityCommand } from "@aws-sdk/client-sesv2";

const domain = process.argv[2];
if (!domain) {
  console.error("Usage: pnpm check-domain <domain> [--watch]");
  process.exit(1);
}
const watch = process.argv.includes("--watch");

const client = new SESv2Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(process.env.MAIL_AWS_ACCESS_KEY_ID && process.env.MAIL_AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.MAIL_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.MAIL_AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

async function check(): Promise<boolean> {
  const res = await client.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
  const verified = res.VerifiedForSendingStatus === true;
  const dkim = res.DkimAttributes?.Status ?? "UNKNOWN";
  console.log(
    [
      `domain:        ${domain}`,
      `verified:      ${verified ? "YES" : "no"}`,
      `dkim status:   ${dkim}`,
      `mail from:     ${res.MailFromAttributes?.MailFromDomain ?? "(none)"} ` +
        `[${res.MailFromAttributes?.MailFromDomainStatus ?? "n/a"}]`,
      `identity type: ${res.IdentityType}`,
      "",
    ].join("\n"),
  );
  return verified && dkim === "SUCCESS";
}

async function main() {
  if (!watch) {
    const ok = await check();
    process.exit(ok ? 0 : 1);
  }
  for (let i = 0; i < 60; i++) {
    if (await check()) {
      console.log("Domain fully verified.");
      process.exit(0);
    }
    console.log("Not ready — checking again in 30s...\n");
    await new Promise((r) => setTimeout(r, 30_000));
  }
  console.error("Timed out waiting for verification.");
  process.exit(1);
}

main().catch((err) => {
  console.error(`check-domain failed: ${(err as Error).message}`);
  process.exit(1);
});

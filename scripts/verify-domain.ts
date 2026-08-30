#!/usr/bin/env tsx
import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
} from "@aws-sdk/client-sesv2";
import { loadEnv, requireAwsCredentials } from "./load-env";

loadEnv();
requireAwsCredentials();

const domain = process.argv[2];
if (!domain) {
  console.error("Usage: pnpm verify-domain <domain>");
  process.exit(1);
}

// Fixed per AWS_HANDOFF.md: identities and production access are per-region.
const region = process.env.AWS_REGION ?? "us-east-1";
if (region !== "us-east-1") {
  console.error(
    `Refusing to run against region "${region}". The SES identities and production
` +
      "access live in us-east-1 (see AWS_HANDOFF.md). Unset AWS_REGION or set it to us-east-1.",
  );
  process.exit(1);
}
const client = new SESv2Client({
  region,
  ...(process.env.MAIL_AWS_ACCESS_KEY_ID && process.env.MAIL_AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.MAIL_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.MAIL_AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

const mailFromSubdomain = `mail.${domain}`;

function table(rows: Array<[string, string, string]>) {
  const headers: [string, string, string] = ["TYPE", "NAME", "VALUE"];
  const all = [headers, ...rows];
  const widths = [0, 1, 2].map((i) => Math.max(...all.map((r) => r[i].length)));
  const line = (r: [string, string, string]) =>
    r.map((cell, i) => cell.padEnd(widths[i])).join("  ");
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));
}

async function main() {
  try {
    await client.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: domain,
        DkimSigningAttributes: { NextSigningKeyLength: "RSA_2048_BIT" },
      }),
    );
    console.log(`Created SES identity for ${domain}.`);
  } catch (err) {
    if ((err as Error).name === "AlreadyExistsException") {
      console.log(`SES identity for ${domain} already exists — continuing.`);
    } else {
      throw err;
    }
  }

  try {
    await client.send(
      new PutEmailIdentityMailFromAttributesCommand({
        EmailIdentity: domain,
        MailFromDomain: mailFromSubdomain,
        BehaviorOnMxFailure: "USE_DEFAULT_VALUE",
      }),
    );
    console.log(`Configured custom MAIL FROM: ${mailFromSubdomain}`);
  } catch (err) {
    console.warn(`Could not set MAIL FROM: ${(err as Error).message}`);
  }

  const identity = await client.send(
    new GetEmailIdentityCommand({ EmailIdentity: domain }),
  );
  const tokens = identity.DkimAttributes?.Tokens ?? [];

  const rows: Array<[string, string, string]> = [
    ...tokens.map(
      (t): [string, string, string] => [
        "CNAME",
        `${t}._domainkey.${domain}`,
        `${t}.dkim.amazonses.com`,
      ],
    ),
    ["MX", mailFromSubdomain, `10 feedback-smtp.${region}.amazonses.com`],
    ["TXT", mailFromSubdomain, `"v=spf1 include:amazonses.com ~all"`],
    ["TXT", `_dmarc.${domain}`, `"v=DMARC1; p=none; rua=mailto:dmarc@${domain}"`],
  ];

  console.log(`\nADD these DNS records for ${domain}:\n`);
  table(rows);
  console.log(
    "\nThis script only PRINTS records — it never writes DNS. Add them by hand.\n" +
      "\nBefore you do:\n" +
      "  * ADD these alongside what is already there. Do not replace the zone.\n" +
      "    Existing mail records on a live domain are load-bearing — on tript.io that\n" +
      "    means the `send` MX/TXT and `resend._domainkey` (Resend), plus\n" +
      "    `smtp._domainkey` and the apex MX/SPF (Mailgun). Ours live under `mail.`\n" +
      "    and coexist with them deliberately.\n" +
      "  * On Cloudflare the three DKIM CNAMEs must be DNS only (grey cloud). A\n" +
      "    proxied CNAME returns Cloudflare's IP instead of the target, so SES never\n" +
      "    sees the record and verification hangs with no error.\n" +
      "  * The DMARC row is a SUGGESTION for a domain with no _dmarc record. If one\n" +
      "    already exists, LEAVE IT ALONE — two _dmarc TXT records break DMARC.\n" +
      `  * One SPF TXT per name. The SPF above belongs on ${mailFromSubdomain},\n` +
      "    not on the apex.\n" +
      `\nDNS propagation usually takes minutes to a few hours.` +
      `\nThen run: pnpm check-domain ${domain}\n`,
  );
  if (tokens.length === 0) {
    console.warn(
      "No DKIM tokens returned yet. Re-run this script in a minute to get them.",
    );
  }
}

main().catch((err) => {
  console.error(`verify-domain failed: ${(err as Error).message}`);
  process.exit(1);
});

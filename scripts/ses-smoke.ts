#!/usr/bin/env tsx
/**
 * Sandbox smoke test against the SES mailbox simulator.
 *
 * The simulator addresses need no verification, work inside the sandbox, and do
 * not affect account reputation. This is the closest thing to a real send that
 * is safe to run before production access is granted.
 *
 *   pnpm smoke:ses                  # success only
 *   pnpm smoke:ses --bounce         # also trigger a hard bounce
 *   pnpm smoke:ses --complaint      # also trigger a complaint
 *   pnpm smoke:ses --all
 *
 * Requires real credentials in .env. It sends through the SES provider directly,
 * bypassing the HTTP route, so no server needs to be running.
 */
import { readFileSync } from "node:fs";
import { renderTemplate } from "../lib/render";

// Minimal .env loader — avoids a dependency and never prints values.
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
} catch {
  console.error("No .env found. Copy .env.example and fill in real credentials.");
  process.exit(1);
}

process.env.EMAIL_PROVIDER = "ses";

const SIMULATOR = {
  success: "success@simulator.amazonses.com",
  bounce: "bounce@simulator.amazonses.com",
  complaint: "complaint@simulator.amazonses.com",
  suppressionlist: "suppressionlist@simulator.amazonses.com",
} as const;

const args = process.argv.slice(2);
const all = args.includes("--all");
const targets: Array<keyof typeof SIMULATOR> = ["success"];
if (all || args.includes("--bounce")) targets.push("bounce");
if (all || args.includes("--complaint")) targets.push("complaint");
if (all || args.includes("--suppressionlist")) targets.push("suppressionlist");

// The from-address must be on a verified identity. Take it from the first
// configured app so this matches what the service would really send.
const from = process.argv.find((a) => a.startsWith("--from="))?.slice("--from=".length);

async function main() {
  const { apps } = await import("../lib/config");
  const app = Array.from(apps.values())[0];
  if (!app) {
    console.error("APPS is empty — nothing to send as.");
    process.exit(1);
  }
  const fromAddress = from ?? app.from;

  console.log(
    `Sending as "${app.fromName}" <${fromAddress}>` +
      (app.configurationSet ? ` [config set: ${app.configurationSet}]` : "") +
      `\nRegion: ${process.env.AWS_REGION ?? "us-east-1"}\n`,
  );

  const { sesProvider } = await import("../lib/providers/ses");

  for (const target of targets) {
    const to = SIMULATOR[target];
    const rendered = await renderTemplate(
      "password-reset",
      { resetUrl: "https://example.com/reset?t=smoke", name: "Smoke Test" },
      app.fromName,
    );
    try {
      const { id } = await sesProvider.send({
        to: [to],
        from: fromAddress,
        fromName: app.fromName,
        replyTo: app.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        ...(app.configurationSet ? { configurationSet: app.configurationSet } : {}),
      });
      console.log(`  ${target.padEnd(16)} accepted  MessageId=${id}`);
    } catch (err) {
      console.error(`  ${target.padEnd(16)} FAILED    ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }

  if (targets.includes("bounce") || targets.includes("complaint")) {
    console.log(
      "\nSES accepted these; the bounce/complaint arrives asynchronously via SNS.\n" +
        "Once the topic is subscribed, check the webhook logs and confirm the address\n" +
        "landed in the right suppression list:\n" +
        "  bounce@    -> mail:suppressed:all          (blocks everything)\n" +
        "  complaint@ -> mail:suppressed:notification (notifications only)\n",
    );
  }
}

main().catch((err) => {
  console.error(`smoke test failed: ${(err as Error).message}`);
  process.exit(1);
});

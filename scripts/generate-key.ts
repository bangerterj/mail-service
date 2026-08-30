#!/usr/bin/env tsx
import { randomBytes } from "node:crypto";

const appId = process.argv[2] ?? "my-app";
const domain = process.argv[3] ?? `${appId}.com`;
const key = `key_live_${randomBytes(16).toString("hex")}`;

const fragment = {
  [key]: {
    appId,
    from: `noreply@${domain}`,
    fromName: appId
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    templates: ["welcome", "password-reset", "verify-email"],
    rateLimit: { requests: 100, window: "1h" },
  },
};

console.log(`\nAPI key (give this to the app, store it once — it is not recoverable):\n`);
console.log(`  ${key}\n`);
console.log("APPS fragment — merge into the APPS env var:\n");
console.log(JSON.stringify(fragment, null, 2));
console.log("\nSingle-line form for pasting into Vercel:\n");
console.log(JSON.stringify(fragment));
console.log(
  "\nUsage: pnpm generate-key <app-id> <domain>   e.g. pnpm generate-key meal-picker mealpicker.com\n",
);

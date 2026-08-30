#!/usr/bin/env tsx
/**
 * Generates an API key and the APPS entry for a new app.
 *
 *   pnpm generate-key <app-id> <domain>
 *   pnpm generate-key <app-id> <domain> --merge=current-apps.json
 *
 * APPS is ONE JSON object holding every app. With --merge, the file's existing
 * apps are preserved and the new one is added alongside them — paste the value
 * currently in Vercel into that file first. Without --merge you get only the
 * new app, which would REPLACE every existing app if pasted directly.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const appId = positional[0] ?? "my-app";
const domain = positional[1] ?? `${appId}.com`;
const mergePath = process.argv
  .find((a) => a.startsWith("--merge="))
  ?.slice("--merge=".length);
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

let merged: Record<string, unknown> = fragment;
let existingCount = 0;

if (mergePath) {
  let raw: string;
  try {
    raw = readFileSync(mergePath, "utf8").trim();
  } catch {
    console.error(`Could not read ${mergePath}.`);
    console.error("Paste the APPS value currently set in Vercel into that file first.");
    process.exit(1);
  }
  let existing: Record<string, unknown>;
  try {
    existing = JSON.parse(raw);
  } catch (err) {
    console.error(`${mergePath} is not valid JSON: ${(err as Error).message}`);
    process.exit(1);
  }
  if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
    console.error(`${mergePath} must contain a JSON object mapping keys to app configs.`);
    process.exit(1);
  }
  const existingIds = Object.values(existing).map(
    (v) => (v as { appId?: string })?.appId,
  );
  if (existingIds.includes(appId)) {
    console.error(
      `An app with appId "${appId}" is already in ${mergePath}.\n` +
        "Two entries with the same appId are rejected at boot. To rotate its key,\n" +
        "replace that entry's key rather than adding another.",
    );
    process.exit(1);
  }
  existingCount = Object.keys(existing).length;
  merged = { ...existing, ...fragment };
}

console.log(`\nAPI key (give this to the app, store it once — it is not recoverable):\n`);
console.log(`  ${key}\n`);
console.log(
  mergePath
    ? `Merged APPS — ${existingCount} existing app(s) preserved, "${appId}" added:\n`
    : "APPS entry for this app alone:\n",
);
console.log(JSON.stringify(merged, null, 2));
console.log("\nSingle-line form for pasting into Vercel:\n");
console.log(JSON.stringify(merged));

if (!mergePath) {
  console.log(
    "\n! This is ONLY the new app. Pasting it into APPS would REPLACE every app\n" +
      "  already configured there. If other apps exist, save the current APPS value\n" +
      "  to a file and re-run with --merge=<file> to get the combined JSON.",
  );
}
console.log(
  "\nUsage: pnpm generate-key <app-id> <domain>   e.g. pnpm generate-key meal-picker mealpicker.com\n",
);

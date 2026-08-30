import { readFileSync } from "node:fs";

/**
 * Loads .env into process.env for standalone scripts.
 *
 * Next.js does this automatically for the app, but a plain `tsx scripts/...`
 * run does not — without it the AWS SDK falls back to the default credential
 * chain and fails confusingly. Existing environment variables win, so an
 * explicit `AWS_REGION=... pnpm ...` still overrides the file.
 *
 * Never logs values.
 */
export function loadEnv(path = ".env"): boolean {
  let contents: string;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return false;
  }

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, name, rawValue] = match;
    if (process.env[name] !== undefined) continue;
    process.env[name] = rawValue.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }
  return true;
}

/** Exits with a clear message when SES credentials are not available. */
export function requireAwsCredentials(): void {
  if (!process.env.MAIL_AWS_ACCESS_KEY_ID || !process.env.MAIL_AWS_SECRET_ACCESS_KEY) {
    console.error(
      "No AWS credentials found.\n" +
        "Set MAIL_AWS_ACCESS_KEY_ID and MAIL_AWS_SECRET_ACCESS_KEY in .env " +
        "(see .env.example),\nor export them in this shell.",
    );
    process.exit(1);
  }
}

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ALPHA_KEY, BETA_KEY } from "./setup-env";
import { GET } from "@/app/api/health/route";

interface AppDetail {
  appId: string;
  keyFingerprint: string;
  templates: string[];
  configurationSet: string | null;
}

async function health() {
  const res = await GET();
  return (await res.json()) as {
    appDetails: AppDetail[];
    appIds: string[];
    templates: string[];
  };
}

const fp = (key: string) =>
  createHash("sha256").update(key).digest("hex").slice(0, 12);

describe("GET /api/health — per-app diagnostics", () => {
  it("reports each app's allowlist, not just the registry", async () => {
    const body = await health();
    const alpha = body.appDetails.find((a) => a.appId === "alpha");
    expect(alpha?.templates).toContain("password-reset");
    // Registered but NOT allowed for alpha — the distinction a 403 turns on.
    expect(body.templates).toContain("verify-email");
    expect(alpha?.templates).not.toContain("verify-email");
  });

  it("fingerprints identify which app a key maps to", async () => {
    const body = await health();
    const byFingerprint = Object.fromEntries(
      body.appDetails.map((a) => [a.keyFingerprint, a.appId]),
    );
    expect(byFingerprint[fp(ALPHA_KEY)]).toBe("alpha");
    expect(byFingerprint[fp(BETA_KEY)]).toBe("beta");
  });

  it("never exposes the key itself, in any form", async () => {
    const res = await GET();
    const raw = JSON.stringify(await res.json());
    for (const key of [ALPHA_KEY, BETA_KEY]) {
      expect(raw).not.toContain(key);
      // Not even a usable prefix — this endpoint is unauthenticated.
      expect(raw).not.toContain(key.slice(0, 16));
    }
  });

  it("fingerprints are stable across calls", async () => {
    const a = await health();
    const b = await health();
    expect(a.appDetails.map((x) => x.keyFingerprint)).toEqual(
      b.appDetails.map((x) => x.keyFingerprint),
    );
  });
});

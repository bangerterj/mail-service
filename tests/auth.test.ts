import { describe, expect, it } from "vitest";
import { ALPHA_KEY, BETA_KEY } from "./setup-env";
import { authenticate, extractBearerToken } from "@/lib/auth";
import { apps } from "@/lib/config";

describe("extractBearerToken", () => {
  it("extracts a bearer token case-insensitively", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
    expect(extractBearerToken("  Bearer   abc123  ")).toBe("abc123");
  });

  it("returns null for missing or non-bearer headers", () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("Basic abc123")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
  });
});

describe("authenticate", () => {
  it("resolves a valid key to its app config", () => {
    expect(authenticate(ALPHA_KEY, apps)?.appId).toBe("alpha");
    expect(authenticate(BETA_KEY, apps)?.appId).toBe("beta");
  });

  it("rejects unknown, empty, and null keys", () => {
    expect(authenticate("key_live_unknown", apps)).toBeNull();
    expect(authenticate("", apps)).toBeNull();
    expect(authenticate(null, apps)).toBeNull();
  });

  it("rejects a key that is a prefix of a valid key (constant-time path)", () => {
    expect(authenticate(ALPHA_KEY.slice(0, -1), apps)).toBeNull();
    expect(authenticate(`${ALPHA_KEY}x`, apps)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import "./setup-env";
import { parseApps } from "@/lib/config";

const valid = {
  key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: {
    appId: "alpha",
    from: "noreply@alpha.test",
    fromName: "Alpha",
    templates: ["welcome"],
  },
};

describe("parseApps", () => {
  it("parses a valid config into a keyed map", () => {
    const apps = parseApps(JSON.stringify(valid));
    expect(apps.size).toBe(1);
    const app = apps.get("key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(app?.appId).toBe("alpha");
    expect(app?.key).toBe("key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  });

  it("accepts an optional replyTo and rateLimit", () => {
    const apps = parseApps(
      JSON.stringify({
        key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: {
          ...valid.key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
          replyTo: "support@alpha.test",
          rateLimit: { requests: 10, window: "1h" },
        },
      }),
    );
    expect(apps.get("key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")?.rateLimit).toEqual({
      requests: 10,
      window: "1h",
    });
  });

  it("throws when APPS is missing or empty", () => {
    expect(() => parseApps(undefined)).toThrow(/APPS is required/);
    expect(() => parseApps("   ")).toThrow(/APPS is required/);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseApps("{not json")).toThrow(/not valid JSON/);
  });

  it("throws on an unknown template name", () => {
    const bad = structuredClone(valid);
    bad.key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.templates = ["nope"];
    expect(() => parseApps(JSON.stringify(bad))).toThrow(/failed validation/);
  });

  it("throws on a non-email from-address", () => {
    const bad = structuredClone(valid);
    bad.key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.from = "not-an-email";
    expect(() => parseApps(JSON.stringify(bad))).toThrow(/failed validation/);
  });

  it("throws on a malformed rate limit window", () => {
    const bad = {
      key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: {
        ...valid.key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
        rateLimit: { requests: 10, window: "forever" },
      },
    };
    expect(() => parseApps(JSON.stringify(bad))).toThrow(/failed validation/);
  });

  it("throws on duplicate appIds across keys", () => {
    const dupe = {
      key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: valid.key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
      key_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb: valid.key_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
    };
    expect(() => parseApps(JSON.stringify(dupe))).toThrow(/duplicate appId/);
  });
});

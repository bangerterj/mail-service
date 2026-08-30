import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALPHA_KEY, BETA_KEY } from "./setup-env";
import type { SendParams } from "@/lib/providers/types";

const sent: SendParams[] = [];
let sendImpl: (p: SendParams) => Promise<{ id: string }> = async () => ({
  id: "msg_test_1",
});

vi.mock("@/lib/providers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/providers/types")>(
    "@/lib/providers/types",
  );
  return {
    ...actual,
    getProvider: () => ({
      name: "mock",
      send: async (p: SendParams) => {
        sent.push(p);
        return sendImpl(p);
      },
    }),
  };
});

/** address -> categories it is suppressed for */
const suppressed = new Map<string, "all" | "notification">();

function blocked(address: string, category: string): boolean {
  const scope = suppressed.get(address);
  if (!scope) return false;
  return scope === "all" || category === "notification";
}

vi.mock("@/lib/suppression", () => ({
  filterSuppressed: async (to: string[], category: string) => ({
    allowed: to.filter((a) => !blocked(a, category)),
    suppressed: to.filter((a) => blocked(a, category)),
  }),
  isSuppressed: async (a: string, category: string) => blocked(a, category),
  suppress: async () => {},
  unsuppress: async () => {},
}));

let limited = false;
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: async () => ({
    success: !limited,
    limit: 100,
    remaining: limited ? 0 : 99,
    retryAfter: limited ? 42 : 0,
  }),
}));

const { POST } = await import("@/app/api/send/route");
const { ProviderError } = await import("@/lib/providers/types");

function request(body: unknown, key: string | null = ALPHA_KEY, raw?: string) {
  return new Request("https://mail.test/api/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: raw ?? JSON.stringify(body),
  }) as never;
}

const validBody = {
  to: "user@example.com",
  template: "password-reset",
  data: { resetUrl: "https://alpha.test/reset?t=1" },
};

beforeEach(() => {
  sent.length = 0;
  suppressed.clear();
  limited = false;
  sendImpl = async () => ({ id: "msg_test_1" });
});

describe("POST /api/send - auth", () => {
  it("401s with no Authorization header", async () => {
    const res = await POST(request(validBody, null));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  it("401s with an unknown key", async () => {
    const res = await POST(request(validBody, "key_live_bogus"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/send - the from-address comes from config", () => {
  it("uses the configured from, fromName and replyTo", async () => {
    const res = await POST(request(validBody));
    expect(res.status).toBe(202);
    expect(sent[0].from).toBe("noreply@alpha.test");
    expect(sent[0].fromName).toBe("Alpha App");
    expect(sent[0].replyTo).toBe("support@alpha.test");
  });

  it("IGNORES a from-address supplied in the request body", async () => {
    const res = await POST(
      request({
        ...validBody,
        from: "attacker@evil.test",
        fromName: "Totally Legit Bank",
        replyTo: "attacker@evil.test",
      }),
    );
    expect(res.status).toBe(202);
    expect(sent[0].from).toBe("noreply@alpha.test");
    expect(sent[0].fromName).toBe("Alpha App");
    expect(sent[0].replyTo).toBe("support@alpha.test");
  });

  it("scopes the from-address to the key that was used", async () => {
    await POST(
      request(
        {
          to: "user@example.com",
          template: "verify-email",
          data: { verifyUrl: "https://beta.test/v" },
        },
        BETA_KEY,
      ),
    );
    expect(sent[0].from).toBe("noreply@beta.test");
  });
});

describe("POST /api/send - template authorization", () => {
  it("403s on a template outside the allowlist", async () => {
    const res = await POST(
      request(
        {
          to: "user@example.com",
          template: "verify-email",
          data: { verifyUrl: "https://alpha.test/v" },
        },
        ALPHA_KEY,
      ),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("template_not_allowed");
    expect(sent).toHaveLength(0);
  });

  it("403s on a template that does not exist", async () => {
    const res = await POST(request({ ...validBody, template: "nonexistent" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/send - validation", () => {
  it("400s on a non-JSON body", async () => {
    const res = await POST(request(null, ALPHA_KEY, "{not json"));
    expect(res.status).toBe(400);
  });

  it("400s on an invalid recipient address", async () => {
    const res = await POST(request({ ...validBody, to: "not-an-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_error");
  });

  it("400s on more than 10 recipients", async () => {
    const to = Array.from({ length: 11 }, (_, i) => `u${i}@example.com`);
    const res = await POST(request({ ...validBody, to }));
    expect(res.status).toBe(400);
  });

  it("400s when template data is missing a required field", async () => {
    const res = await POST(request({ ...validBody, data: {} }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.details.resetUrl).toBeTruthy();
    expect(sent).toHaveLength(0);
  });

  it("accepts an array of recipients", async () => {
    const res = await POST(
      request({ ...validBody, to: ["a@example.com", "b@example.com"] }),
    );
    expect(res.status).toBe(202);
    expect(sent[0].to).toEqual(["a@example.com", "b@example.com"]);
  });
});

describe("POST /api/send - rate limiting", () => {
  it("429s with Retry-After when over the limit", async () => {
    limited = true;
    const res = await POST(request(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect((await res.json()).error.code).toBe("rate_limited");
  });
});

describe("POST /api/send - suppression", () => {
  it("returns 200 suppressed when every recipient is suppressed", async () => {
    suppressed.set("user@example.com", "all");
    const res = await POST(request(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "suppressed" });
    expect(sent).toHaveLength(0);
  });

  it("sends to the remaining recipients when only some are suppressed", async () => {
    suppressed.set("bad@example.com", "all");
    const res = await POST(
      request({ ...validBody, to: ["bad@example.com", "good@example.com"] }),
    );
    expect(res.status).toBe(202);
    expect(sent[0].to).toEqual(["good@example.com"]);
  });
});

describe("POST /api/send - rendering and provider errors", () => {
  it("sends both an HTML and a plaintext part", async () => {
    await POST(request(validBody));
    expect(sent[0].html).toContain("https://alpha.test/reset?t=1");
    expect(sent[0].text).toContain("https://alpha.test/reset?t=1");
    expect(sent[0].subject).toBe("Reset your password");
  });

  it("502s without leaking the provider error detail", async () => {
    sendImpl = async () => {
      throw new ProviderError("SES send failed: AccessDeniedException", false);
    };
    const res = await POST(request(validBody));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("provider_error");
    expect(JSON.stringify(body)).not.toContain("AccessDenied");
  });

  it("500s on an unexpected error", async () => {
    sendImpl = async () => {
      throw new Error("kaboom");
    };
    const res = await POST(request(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("internal_error");
  });

  it("returns the provider message id on success", async () => {
    const res = await POST(request(validBody));
    expect(await res.json()).toEqual({ id: "msg_test_1", status: "sent" });
  });
});

const mentionBody = {
  to: "user@example.com",
  template: "mention",
  data: {
    actorName: "Jeff",
    contextTitle: "Q3 planning",
    url: "https://alpha.test/t/1",
  },
  unsubscribeUrl: "https://alpha.test/settings/notifications",
};

describe("POST /api/send - notification templates require an opt-out", () => {
  it("400s when a notification template has no unsubscribeUrl", async () => {
    const { unsubscribeUrl, ...withoutUnsub } = mentionBody;
    void unsubscribeUrl;
    const res = await POST(request(withoutUnsub));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details.unsubscribeUrl).toBeTruthy();
    expect(sent).toHaveLength(0);
  });

  it("400s when unsubscribeUrl is not a URL", async () => {
    const res = await POST(request({ ...mentionBody, unsubscribeUrl: "nope" }));
    expect(res.status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("sets both List-Unsubscribe headers on a notification send", async () => {
    const res = await POST(request(mentionBody));
    expect(res.status).toBe(202);
    expect(sent[0].headers).toEqual({
      "List-Unsubscribe": "<https://alpha.test/settings/notifications>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("renders the visible unsubscribe link into the notification body", async () => {
    await POST(request(mentionBody));
    expect(sent[0].html).toContain("https://alpha.test/settings/notifications");
    expect(sent[0].text).toContain("https://alpha.test/settings/notifications");
  });

  it("sets NO List-Unsubscribe headers on a transactional send", async () => {
    const res = await POST(request(validBody));
    expect(res.status).toBe(202);
    expect(sent[0].headers).toBeUndefined();
  });

  it("ignores an unsubscribeUrl passed to a transactional template", async () => {
    const res = await POST(
      request({ ...validBody, unsubscribeUrl: "https://alpha.test/unsub" }),
    );
    expect(res.status).toBe(202);
    expect(sent[0].headers).toBeUndefined();
    expect(sent[0].html.toLowerCase()).not.toContain("unsubscribe");
  });
});

describe("POST /api/send - suppression is category-aware", () => {
  it("blocks a notification to a complainer but still sends their password reset", async () => {
    suppressed.set("user@example.com", "notification");

    const notificationRes = await POST(request(mentionBody));
    expect(notificationRes.status).toBe(200);
    expect(await notificationRes.json()).toMatchObject({ status: "suppressed" });
    expect(sent).toHaveLength(0);

    const transactionalRes = await POST(request(validBody));
    expect(transactionalRes.status).toBe(202);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Reset your password");
  });

  it("blocks both categories for a hard-bounced address", async () => {
    suppressed.set("user@example.com", "all");
    expect((await POST(request(mentionBody))).status).toBe(200);
    expect((await POST(request(validBody))).status).toBe(200);
    expect(sent).toHaveLength(0);
  });
});

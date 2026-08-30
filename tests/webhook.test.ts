import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setup-env";

const suppressed: Array<{ address: string; reason: string; scope?: string }> = [];
vi.mock("@/lib/suppression", () => ({
  suppress: async (address: string, reason: string, scope?: string) => {
    suppressed.push({ address, reason, scope });
  },
}));

const fetchMock = vi.fn(async (url: unknown) => {
  void url;
  return new Response("ok", { status: 200 });
});
vi.stubGlobal("fetch", fetchMock);

const { POST } = await import("@/app/api/webhooks/ses/route");

function snsRequest(payload: unknown, secret?: string) {
  const url = new URL("https://mail.test/api/webhooks/ses");
  if (secret) url.searchParams.set("secret", secret);
  const req = new Request(url, {
    method: "POST",
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  }) as unknown as { nextUrl: URL } & Request;
  // NextRequest exposes nextUrl; the route only reads searchParams from it.
  Object.defineProperty(req, "nextUrl", { value: url });
  return req as never;
}

beforeEach(() => {
  suppressed.length = 0;
  fetchMock.mockClear();
  delete process.env.SES_WEBHOOK_SECRET;
});

describe("SES webhook - SubscriptionConfirmation", () => {
  it("fetches the SubscribeURL to activate the subscription", async () => {
    const res = await POST(
      snsRequest({
        Type: "SubscriptionConfirmation",
        MessageId: "m1",
        TopicArn: "arn:aws:sns:us-east-1:1:mail",
        Message: "confirm me",
        Token: "tok",
        Timestamp: "2026-01-01T00:00:00.000Z",
        SubscribeURL: "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription",
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "subscription_confirmed" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("ConfirmSubscription");
  });

  it("400s when SubscribeURL is missing", async () => {
    const res = await POST(
      snsRequest({
        Type: "SubscriptionConfirmation",
        MessageId: "m1",
        TopicArn: "arn",
        Message: "x",
        Timestamp: "2026-01-01T00:00:00.000Z",
      }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function notification(event: unknown) {
  return {
    Type: "Notification",
    MessageId: "m2",
    TopicArn: "arn:aws:sns:us-east-1:1:mail",
    Timestamp: "2026-01-01T00:00:00.000Z",
    Message: JSON.stringify(event),
  };
}

describe("SES webhook - bounces and complaints", () => {
  it("suppresses recipients of a permanent bounce", async () => {
    const res = await POST(
      snsRequest(
        notification({
          eventType: "Bounce",
          bounce: {
            bounceType: "Permanent",
            bounceSubType: "General",
            bouncedRecipients: [{ emailAddress: "gone@example.com" }],
          },
        }),
      ),
    );
    expect(res.status).toBe(200);
    // A dead address is blocked for every category.
    expect(suppressed).toEqual([
      { address: "gone@example.com", reason: "hard-bounce:General", scope: "all" },
    ]);
  });

  it("does NOT suppress on a transient (soft) bounce", async () => {
    const res = await POST(
      snsRequest(
        notification({
          eventType: "Bounce",
          bounce: {
            bounceType: "Transient",
            bounceSubType: "MailboxFull",
            bouncedRecipients: [{ emailAddress: "full@example.com" }],
          },
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(suppressed).toHaveLength(0);
  });

  it("suppresses notifications only on a complaint, never transactional mail", async () => {
    await POST(
      snsRequest(
        notification({
          eventType: "Complaint",
          complaint: {
            complaintFeedbackType: "abuse",
            complainedRecipients: [{ emailAddress: "angry@example.com" }],
          },
        }),
      ),
    );
    // Scope is "notification": a spam report on a mention email must not block
    // that person's password reset.
    expect(suppressed).toEqual([
      { address: "angry@example.com", reason: "complaint", scope: "notification" },
    ]);
  });

  it("ignores unrelated SES event types", async () => {
    const res = await POST(snsRequest(notification({ eventType: "Delivery" })));
    expect(res.status).toBe(200);
    expect(suppressed).toHaveLength(0);
  });

  it("400s on an unparseable SNS envelope", async () => {
    const res = await POST(snsRequest("{not json"));
    expect(res.status).toBe(400);
  });
});

describe("SES webhook - shared secret", () => {
  it("401s when the secret is set but missing from the query", async () => {
    process.env.SES_WEBHOOK_SECRET = "s3cret";
    vi.resetModules();
    const mod = await import("@/app/api/webhooks/ses/route");
    const res = await mod.POST(snsRequest(notification({ eventType: "Delivery" })));
    expect(res.status).toBe(401);
  });

  it("401s when the secret is wrong", async () => {
    process.env.SES_WEBHOOK_SECRET = "s3cret";
    vi.resetModules();
    const mod = await import("@/app/api/webhooks/ses/route");
    const res = await mod.POST(
      snsRequest(notification({ eventType: "Delivery" }), "wrong!"),
    );
    expect(res.status).toBe(401);
  });

  it("accepts the request when the secret matches", async () => {
    process.env.SES_WEBHOOK_SECRET = "s3cret";
    vi.resetModules();
    const mod = await import("@/app/api/webhooks/ses/route");
    const res = await mod.POST(
      snsRequest(notification({ eventType: "Delivery" }), "s3cret"),
    );
    expect(res.status).toBe(200);
  });
});

describe("SES webhook - signature checks", () => {
  it("rejects a message whose SigningCertURL is not an AWS host", async () => {
    const res = await POST(
      snsRequest({
        ...notification({ eventType: "Delivery" }),
        Signature: "abc",
        SigningCertURL: "https://evil.test/cert.pem",
      }),
    );
    expect(res.status).toBe(401);
  });
});

import { describe, expect, it, vi } from "vitest";
import { MailError, createMailClient } from "../packages/client/src/index";

function client(fetchImpl: typeof globalThis.fetch, retries = 1) {
  return createMailClient({
    apiKey: "key_live_test",
    baseUrl: "https://mail.test/",
    fetch: fetchImpl,
    retries,
    timeoutMs: 500,
  });
}

const ok = () =>
  new Response(JSON.stringify({ id: "m1", status: "sent" }), { status: 202 });

describe("createMailClient", () => {
  it("posts to /api/send with the bearer key and normalizes the base URL", async () => {
    const fetchImpl = vi.fn(async () => ok());
    await client(fetchImpl as never).send({
      to: "a@example.com",
      template: "welcome",
      data: {},
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://mail.test/api/send");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer key_live_test",
    );
  });

  it("returns the parsed success body", async () => {
    const res = await client(vi.fn(async () => ok()) as never).send({
      to: "a@example.com",
      template: "welcome",
      data: {},
    });
    expect(res).toEqual({ id: "m1", status: "sent" });
  });

  it("throws a typed rate-limit error with retryAfter and does not retry", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: "rate_limited", message: "no" } }), {
          status: 429,
          headers: { "retry-after": "42" },
        }),
    );
    await expect(
      client(fetchImpl as never).send({
        to: "a@example.com",
        template: "welcome",
        data: {},
      }),
    ).rejects.toMatchObject({ code: "rate_limited", retryAfter: 42 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 400", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { code: "validation_error", message: "bad" } }),
          { status: 400 },
        ),
    );
    await expect(
      client(fetchImpl as never).send({
        to: "a@example.com",
        template: "welcome",
        data: {},
      }),
    ).rejects.toSatisfy((e: unknown) => (e as MailError).isInvalidRequest);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once on a 5xx and succeeds", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call++;
      return call === 1 ? new Response("boom", { status: 503 }) : ok();
    });
    const res = await client(fetchImpl as never).send({
      to: "a@example.com",
      template: "welcome",
      data: {},
    });
    expect(res.status).toBe("sent");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries once on a network error then surfaces a typed error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(
      client(fetchImpl as never).send({
        to: "a@example.com",
        template: "welcome",
        data: {},
      }),
    ).rejects.toMatchObject({ code: "network_error" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("requires apiKey and baseUrl", () => {
    expect(() => createMailClient({ apiKey: "", baseUrl: "x" })).toThrow(/apiKey/);
    expect(() => createMailClient({ apiKey: "x", baseUrl: "" })).toThrow(/baseUrl/);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import "./setup-env";

/** key -> members, so the two suppression lists stay distinguishable. */
const store = new Map<string, Set<string>>();
const setFor = (k: string) => store.get(k) ?? store.set(k, new Set()).get(k)!;

vi.mock("@/lib/redis", () => ({
  getRedis: () => ({
    sadd: async (k: string, v: string) => (setFor(k).add(v), 1),
    srem: async (k: string, v: string) => (setFor(k).delete(v), 1),
    sismember: async (k: string, v: string) => (setFor(k).has(v) ? 1 : 0),
  }),
}));

const { filterSuppressed, isSuppressed, suppress, unsuppress } = await import(
  "@/lib/suppression"
);

describe("suppression list", () => {
  beforeEach(() => store.clear());

  it("suppresses and reports an address, case-insensitively", async () => {
    await suppress("Bounced@Example.com", "hard-bounce", "all");
    expect(await isSuppressed("bounced@example.com")).toBe(true);
    expect(await isSuppressed("BOUNCED@EXAMPLE.COM")).toBe(true);
    expect(await isSuppressed("fine@example.com")).toBe(false);
  });

  it("partitions recipients into allowed and suppressed", async () => {
    await suppress("bad@example.com", "hard-bounce", "all");
    const res = await filterSuppressed(["good@example.com", "bad@example.com"]);
    expect(res.allowed).toEqual(["good@example.com"]);
    expect(res.suppressed).toEqual(["bad@example.com"]);
  });

  it("removes an address on unsuppress", async () => {
    await suppress("x@example.com", "complaint", "notification");
    await unsuppress("x@example.com");
    expect(await isSuppressed("x@example.com")).toBe(false);
  });
});

describe("suppression is category-aware", () => {
  beforeEach(() => store.clear());

  it("a complaint blocks notifications but NOT transactional mail", async () => {
    await suppress("angry@example.com", "complaint", "notification");
    expect(await isSuppressed("angry@example.com", "notification")).toBe(true);
    expect(await isSuppressed("angry@example.com", "transactional")).toBe(false);

    const notif = await filterSuppressed(["angry@example.com"], "notification");
    expect(notif.allowed).toHaveLength(0);
    const txn = await filterSuppressed(["angry@example.com"], "transactional");
    expect(txn.allowed).toEqual(["angry@example.com"]);
  });

  it("a hard bounce blocks both categories", async () => {
    await suppress("gone@example.com", "hard-bounce", "all");
    expect(await isSuppressed("gone@example.com", "notification")).toBe(true);
    expect(await isSuppressed("gone@example.com", "transactional")).toBe(true);
  });

  it("unsuppress with no scope clears both lists", async () => {
    await suppress("x@example.com", "hard-bounce", "all");
    await suppress("x@example.com", "complaint", "notification");
    await unsuppress("x@example.com");
    expect(await isSuppressed("x@example.com", "transactional")).toBe(false);
    expect(await isSuppressed("x@example.com", "notification")).toBe(false);
  });
});

describe("suppression without redis", () => {
  it("allows every recipient and never throws", async () => {
    vi.resetModules();
    vi.doMock("@/lib/redis", () => ({ getRedis: () => null }));
    const mod = await import("@/lib/suppression");
    expect(await mod.isSuppressed("anyone@example.com")).toBe(false);
    const res = await mod.filterSuppressed(["a@x.test", "b@x.test"]);
    expect(res.allowed).toHaveLength(2);
    expect(res.suppressed).toHaveLength(0);
    await expect(mod.suppress("a@x.test", "hard-bounce")).resolves.toBeUndefined();
    vi.doUnmock("@/lib/redis");
    vi.resetModules();
  });
});

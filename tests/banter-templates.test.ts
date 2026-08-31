import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates, isTokenTemplate } from "@/emails";
import { missingTokens } from "@/lib/token-render";
import { renderTemplate } from "@/lib/render";

const DATA = {
  identifier: "jeff@example.com",
  signInUrl: "https://banter.camp/api/auth/callback?token=abc&next=/feed",
};

describe("banter-signin", () => {
  it("is a token template using every token it declares", () => {
    const t = templates["banter-signin"];
    if (!isTokenTemplate(t)) throw new Error("expected token template");
    expect(missingTokens(t.html, t.tokens)).toEqual([]);
    expect(missingTokens(t.textTemplate, t.tokens)).toEqual([]);
  });

  it("keeps the lowercase subject banter.camp actually sends", async () => {
    const out = await renderTemplate("banter-signin", DATA, "Banter");
    expect(out.subject).toBe("log in to banter.camp");
  });

  it("preserves the brand chrome from the live email", async () => {
    const out = await renderTemplate("banter-signin", DATA, "Banter");
    for (const needle of [
      "#f3ecd9", // cream shell
      "#fdfbf7", // card
      "#b34d22", // rust button
      "border-radius: 24px", // pill
      "Confirm Identity",
      "ad-free", // the beta pricing line is brand copy, not boilerplate
      "sent from the banter.camp automated systems",
    ]) {
      expect(out.html).toContain(needle);
    }
  });

  it("shows the requesting address and the link in both parts", async () => {
    const out = await renderTemplate("banter-signin", DATA, "Banter");
    expect(out.html).toContain("jeff@example.com");
    expect(out.text).toContain("jeff@example.com");
    expect(out.text).toContain(DATA.signInUrl);
    expect(out.text).not.toContain("<");
  });

  it("escapes the ampersand in the href but keeps the URL usable in text", async () => {
    const out = await renderTemplate("banter-signin", DATA, "Banter");
    expect(out.html).toContain("token=abc&amp;next=/feed");
    expect(out.text).toContain("token=abc&next=/feed");
  });

  it("carries no unsubscribe — it is a sign-in link", async () => {
    const out = await renderTemplate("banter-signin", DATA, "Banter");
    expect(out.html.toLowerCase()).not.toContain("unsubscribe");
  });

  it("rejects a non-email identifier and a bad URL", () => {
    const t = templates["banter-signin"];
    expect(t.schema.safeParse({ ...DATA, identifier: "nope" }).success).toBe(false);
    expect(t.schema.safeParse({ ...DATA, signInUrl: "not-a-url" }).success).toBe(false);
    expect(t.schema.safeParse(DATA).success).toBe(true);
  });
});

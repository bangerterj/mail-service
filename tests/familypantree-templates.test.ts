import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates, isTokenTemplate, type TemplateName } from "@/emails";
import { missingTokens } from "@/lib/token-render";
import { renderTemplate } from "@/lib/render";

const FP = [
  "familypantree-password-reset",
  "familypantree-magic-sign-in",
  "familypantree-household-invite",
  "familypantree-group-invite",
] as const satisfies readonly TemplateName[];

const DATA: Record<(typeof FP)[number], Record<string, string>> = {
  "familypantree-password-reset": {
    resetUrl: "https://familypantree.com/reset?t=1",
    loginUrl: "https://familypantree.com/login",
    siteDomain: "familypantree.com",
    postalAddress: "123 Main St, Provo UT",
    preferencesUrl: "https://familypantree.com/prefs",
    reportUrl: "mailto:abuse@familypantree.com",
  },
  "familypantree-magic-sign-in": {
    signInUrl: "https://familypantree.com/signin?t=1",
    siteDomain: "familypantree.com",
    postalAddress: "123 Main St, Provo UT",
    preferencesUrl: "https://familypantree.com/prefs",
  },
  "familypantree-household-invite": {
    inviterFirstName: "Jeff",
    inviterEmail: "jeff@familypantree.com",
    householdName: "The Bangerters",
    memberCount: "9 people",
    storeCount: "3 stores",
    stapleCount: "42 staples",
    joinUrl: "https://familypantree.com/join",
    inviteCode: "abc123",
    expiresInDays: "7 days",
    postalAddress: "123 Main St, Provo UT",
    reportUrl: "mailto:abuse@familypantree.com",
  },
  "familypantree-group-invite": {
    inviterFirstName: "Jeff",
    groupName: "Weeknight Dinners",
    memberCount: "4 people",
    recipeCount: "18 recipes",
    joinUrl: "https://familypantree.com/g",
    groupCode: "xyz789",
    postalAddress: "123 Main St, Provo UT",
    reportUrl: "mailto:abuse@familypantree.com",
  },
};

/** Notification templates get preferencesUrl injected from unsubscribeUrl. */
const UNSUB = "https://familypantree.com/prefs?token=abc";

describe("familypantree templates", () => {
  it.each(FP)("%s is a token template", (name) => {
    expect(isTokenTemplate(templates[name])).toBe(true);
  });

  it.each(FP)("%s uses every token it declares", (name) => {
    const t = templates[name];
    if (!isTokenTemplate(t)) throw new Error("expected token template");
    // A declared-but-unused token means the port dropped a fact the design stated.
    expect(missingTokens(t.html, t.tokens)).toEqual([]);
    expect(missingTokens(t.textTemplate, t.tokens)).toEqual([]);
  });

  it.each(FP)("%s renders both parts with the postal address", async (name) => {
    const out = await renderTemplate(name, DATA[name], "Family Pantree", UNSUB);
    expect(out.subject.length).toBeGreaterThan(0);
    expect(out.html).toContain("<!DOCTYPE html>");
    expect(out.html).toContain("123 Main St");
    expect(out.text).toContain("123 Main St");
    expect(out.text).not.toContain("<");
  });

  it("keeps the household consent facts in both parts", async () => {
    const out = await renderTemplate(
      "familypantree-household-invite",
      DATA["familypantree-household-invite"],
      "Family Pantree",
      UNSUB,
    );
    for (const fact of ["9 people", "3 stores", "42 staples", "The Bangerters"]) {
      expect(out.html).toContain(fact);
      expect(out.text).toContain(fact);
    }
  });

  it("wires the visible preferences link to the request's unsubscribeUrl", async () => {
    for (const name of [
      "familypantree-household-invite",
      "familypantree-group-invite",
    ] as const) {
      const out = await renderTemplate(name, DATA[name], "Family Pantree", UNSUB);
      expect(out.html).toContain(UNSUB);
      expect(out.text).toContain(UNSUB);
    }
  });

  it("escapes a hostile household name rather than emitting markup", async () => {
    const out = await renderTemplate(
      "familypantree-household-invite",
      {
        ...DATA["familypantree-household-invite"],
        householdName: '<img src=x onerror="alert(1)">',
      },
      "Family Pantree",
      UNSUB,
    );
    expect(out.html).not.toContain("<img src=x");
    expect(out.html).toContain("&lt;img src=x");
  });

  it("refuses a javascript: URL instead of silently neutering it", async () => {
    await expect(
      renderTemplate(
        "familypantree-household-invite",
        { ...DATA["familypantree-household-invite"], reportUrl: "javascript:alert(1)" },
        "Family Pantree",
        UNSUB,
      ),
    ).rejects.toThrow(/refusing to link/);
  });

  it("tags a bad link scheme as a caller error, naming the token", async () => {
    const { InvalidTokenValueError } = await import("@/lib/token-render");
    try {
      await renderTemplate(
        "familypantree-household-invite",
        { ...DATA["familypantree-household-invite"], reportUrl: "javascript:alert(1)" },
        "Family Pantree",
        UNSUB,
      );
      throw new Error("expected a rejection");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTokenValueError);
      expect((err as InstanceType<typeof InvalidTokenValueError>).token).toBe("reportUrl");
    }
  });

  it("throws rather than shipping an unsubstituted placeholder", async () => {
    const partial = { ...DATA["familypantree-group-invite"] };
    delete (partial as Record<string, string>).groupName;
    await expect(
      renderTemplate("familypantree-group-invite", partial, "Family Pantree", UNSUB),
    ).rejects.toThrow(/no value supplied|never substituted/);
  });

  it("rejects invalid data at the schema, before rendering", () => {
    const t = templates["familypantree-household-invite"];
    expect(t.schema.safeParse({}).success).toBe(false);
    const noCounts = { ...DATA["familypantree-household-invite"] };
    delete (noCounts as Record<string, string>).memberCount;
    expect(t.schema.safeParse(noCounts).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import "./setup-env";
import { templateNames, templates } from "@/emails";
import { renderTemplate } from "@/lib/render";

describe("template registry", () => {
  it("exposes every registered template", () => {
    expect(new Set(templateNames)).toEqual(
      new Set([
        "welcome",
        "password-reset",
        "verify-email",
        "mention",
        "activity-digest",
        "magic-sign-in",
        "household-invite",
        "group-invite",
        // App-specific templates: FamilyPantree's own design, served verbatim.
        "familypantree-password-reset",
        "familypantree-magic-sign-in",
        "familypantree-household-invite",
        "familypantree-group-invite",
        "banter-signin",
        "banter-recap",
      ]),
    );
  });

  it("categorizes sign-in as transactional and invites as notifications", () => {
    expect(templates["magic-sign-in"].category).toBe("transactional");
    expect(templates["household-invite"].category).toBe("notification");
    expect(templates["group-invite"].category).toBe("notification");
  });

  it("requires the household invite consent panel to be non-empty", () => {
    const base = {
      inviterName: "Jeff",
      householdName: "The Bangerters",
      acceptUrl: "https://a.test/i/1",
    };
    expect(templates["household-invite"].schema.safeParse(base).success).toBe(false);
    expect(
      templates["household-invite"].schema.safeParse({ ...base, shares: [] }).success,
    ).toBe(false);
    expect(
      templates["household-invite"].schema.safeParse({ ...base, shares: ["Pantry"] })
        .success,
    ).toBe(true);
  });

  it("categorizes auth mail transactional and activity mail notification", () => {
    expect(templates["password-reset"].category).toBe("transactional");
    expect(templates["verify-email"].category).toBe("transactional");
    expect(templates.welcome.category).toBe("transactional");
    expect(templates.mention.category).toBe("notification");
    expect(templates["activity-digest"].category).toBe("notification");
  });

  it("rejects mention data without an actor, context and url", () => {
    expect(templates.mention.schema.safeParse({}).success).toBe(false);
    expect(
      templates.mention.schema.safeParse({
        actorName: "Jeff",
        contextTitle: "Q3 planning",
        url: "https://a.test/t/1",
      }).success,
    ).toBe(true);
  });

  it("rejects password-reset data without a valid resetUrl", () => {
    expect(templates["password-reset"].schema.safeParse({}).success).toBe(false);
    expect(
      templates["password-reset"].schema.safeParse({ resetUrl: "not-a-url" }).success,
    ).toBe(false);
    expect(
      templates["password-reset"].schema.safeParse({ resetUrl: "https://a.test/r" })
        .success,
    ).toBe(true);
  });

  it("rejects verify-email data without a valid verifyUrl", () => {
    expect(templates["verify-email"].schema.safeParse({}).success).toBe(false);
    expect(
      templates["verify-email"].schema.safeParse({ verifyUrl: "https://a.test/v" })
        .success,
    ).toBe(true);
  });

  it("allows welcome with no data at all", () => {
    expect(templates.welcome.schema.safeParse({}).success).toBe(true);
  });
});

describe("renderTemplate", () => {
  it("renders both an HTML and a plaintext part containing the URL", async () => {
    const out = await renderTemplate(
      "password-reset",
      { resetUrl: "https://alpha.test/reset?t=1", name: "Jeff" },
      "Alpha App",
    );
    expect(out.subject).toBe("Reset your password");
    expect(out.html).toContain("https://alpha.test/reset?t=1");
    expect(out.html).toContain("Alpha App");
    expect(out.text).toContain("https://alpha.test/reset?t=1");
    expect(out.text.length).toBeGreaterThan(20);
    expect(out.text).not.toContain("<html");
  });

  it("renders the unsubscribe link into both parts of a notification email", async () => {
    const out = await renderTemplate(
      "mention",
      { actorName: "Jeff", contextTitle: "Q3 planning", url: "https://a.test/t/1" },
      "Alpha App",
      "https://a.test/settings/notifications",
    );
    expect(out.subject).toBe("Jeff mentioned you in Q3 planning");
    expect(out.html).toContain("https://a.test/settings/notifications");
    expect(out.html).toContain("Unsubscribe");
    expect(out.text).toContain("https://a.test/settings/notifications");
  });

  it("renders no unsubscribe link into a transactional email", async () => {
    const out = await renderTemplate(
      "password-reset",
      { resetUrl: "https://a.test/reset" },
      "Alpha App",
    );
    expect(out.html.toLowerCase()).not.toContain("unsubscribe");
    expect(out.text.toLowerCase()).not.toContain("unsubscribe");
  });

  it("renders the household consent panel into both parts", async () => {
    const out = await renderTemplate(
      "household-invite",
      {
        inviterName: "Jeff",
        householdName: "The Bangerters",
        acceptUrl: "https://a.test/i/1",
        shares: ["Pantry inventory", "Shopping cart", "Every shopping list"],
      },
      "Family Pantree",
      "https://a.test/opt-out",
    );
    expect(out.subject).toBe("Jeff invited you to join The Bangerters");
    for (const part of [out.html, out.text]) {
      expect(part).toContain("Pantry inventory");
      expect(part).toContain("Shopping cart");
      expect(part).toContain("Every shopping list");
      expect(part).toContain("https://a.test/opt-out");
    }
  });

  it("group invite states recipe-only scope and never implies household sharing", async () => {
    const out = await renderTemplate(
      "group-invite",
      {
        inviterName: "Jeff",
        groupName: "Sunday Dinner Crew",
        acceptUrl: "https://a.test/g/1",
      },
      "Family Pantree",
      "https://a.test/opt-out",
    );
    expect(out.subject).toBe("Jeff invited you to Sunday Dinner Crew");
    // Must say recipes only, and must NOT claim to share pantry/cart/lists.
    expect(out.text.toLowerCase()).toContain("recipes only");
    expect(out.text).toMatch(/does not share your pantry/i);
    expect(out.html).toMatch(/recipes/i);
  });

  it("magic sign-in carries no unsubscribe and warns about forwarding", async () => {
    const out = await renderTemplate(
      "magic-sign-in",
      { signInUrl: "https://a.test/auth?t=1", expiresIn: "in 15 minutes" },
      "Family Pantree",
    );
    expect(out.subject).toBe("Sign in to Family Pantree");
    expect(out.text).toContain("https://a.test/auth?t=1");
    expect(out.text.toLowerCase()).toContain("do not forward");
    expect(out.html.toLowerCase()).not.toContain("unsubscribe");
  });

  it("puts the app name in the welcome and verify subjects", async () => {
    const welcome = await renderTemplate("welcome", {}, "Alpha App");
    expect(welcome.subject).toBe("Welcome to Alpha App");
    const verify = await renderTemplate(
      "verify-email",
      { verifyUrl: "https://beta.test/v" },
      "Beta App",
    );
    expect(verify.subject).toBe("Confirm your email for Beta App");
  });
});

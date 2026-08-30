import { describe, expect, it } from "vitest";
import "./setup-env";
import { templateNames, templates } from "@/emails";
import { renderTemplate } from "@/lib/render";

describe("template registry", () => {
  it("exposes the five planned templates", () => {
    expect(new Set(templateNames)).toEqual(
      new Set([
        "welcome",
        "password-reset",
        "verify-email",
        "mention",
        "activity-digest",
      ]),
    );
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

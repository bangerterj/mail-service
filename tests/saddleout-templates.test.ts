import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates } from "@/emails";
import { renderTemplate } from "@/lib/render";
import { missingTokens } from "@/lib/token-render";
import {
  SADDLEOUT_NEW_SIGNUP_HTML,
  SADDLEOUT_NEW_SIGNUP_TEXT,
  SADDLEOUT_NEW_SIGNUP_TOKENS,
} from "@/emails/saddleout/new-signup";

const DATA = {
  eyebrow: "JOINED THE QUEUE",
  headline: "trailrat joined the queue at #12",
  details: "Email: rider@example.com\nDevices: iPhone 15, Windows PC\nTrainer: <b>KICKR</b> & Zwift Click",
  totals: "3 in the first wave · 12 in the queue · 40 interested",
  adminUrl: "https://saddleout.com/admin?q=rider%40example.com",
};
const OFF = "https://saddleout.com/alerts/off?t=abc";

describe("saddleout-new-signup", () => {
  it("is a notification whose footer link is the unsubscribe URL", async () => {
    expect(templates["saddleout-new-signup"].category).toBe("notification");
    const out = await renderTemplate("saddleout-new-signup", DATA, "SaddleOut", OFF);
    expect(out.subject).toBe("SaddleOut beta: trailrat joined the queue at #12");
    expect(out.html).toContain(`href="${OFF}"`);
    expect(out.text).toContain(`Stop these emails: ${OFF}`);
  });

  it("uses every token in both bodies and escapes rider-typed text", async () => {
    expect(missingTokens(SADDLEOUT_NEW_SIGNUP_HTML, SADDLEOUT_NEW_SIGNUP_TOKENS)).toEqual([]);
    expect(missingTokens(SADDLEOUT_NEW_SIGNUP_TEXT, SADDLEOUT_NEW_SIGNUP_TOKENS)).toEqual([]);
    const out = await renderTemplate("saddleout-new-signup", DATA, "SaddleOut", OFF);
    expect(out.html).toContain("&lt;b&gt;KICKR&lt;/b&gt; &amp; Zwift Click");
    expect(out.html).not.toContain("<b>KICKR");
    expect(out.text).toContain("Trainer: <b>KICKR</b> & Zwift Click");
  });

  it("requires the admin link", () => {
    const { adminUrl: _, ...rest } = DATA;
    expect(templates["saddleout-new-signup"].schema.safeParse(rest).success).toBe(false);
  });
});

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
import {
  SADDLEOUT_BETA_ACCESS_HTML,
  SADDLEOUT_BETA_ACCESS_TEXT,
  SADDLEOUT_BETA_ACCESS_TOKENS,
} from "@/emails/saddleout/beta-access";
import {
  SADDLEOUT_ROUTE_READY_HTML,
  SADDLEOUT_ROUTE_READY_TEXT,
  SADDLEOUT_ROUTE_READY_TOKENS,
  SADDLEOUT_ROUTE_UPDATE_HTML,
  SADDLEOUT_ROUTE_UPDATE_TEXT,
  SADDLEOUT_ROUTE_UPDATE_TOKENS,
} from "@/emails/saddleout/route-update";

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

describe("saddleout-beta-access", () => {
  it("is transactional, uses every token, and escapes the username", async () => {
    expect(templates["saddleout-beta-access"].category).toBe("transactional");
    expect(missingTokens(SADDLEOUT_BETA_ACCESS_HTML, SADDLEOUT_BETA_ACCESS_TOKENS)).toEqual([]);
    expect(missingTokens(SADDLEOUT_BETA_ACCESS_TEXT, SADDLEOUT_BETA_ACCESS_TOKENS)).toEqual([]);
    const out = await renderTemplate(
      "saddleout-beta-access",
      { name: "<i>trailrat</i>", devices: "for your iPhone and Windows PC", pageUrl: "https://saddleout.com/#join" },
      "SaddleOut",
    );
    expect(out.subject).toBe("You're in the SaddleOut beta");
    expect(out.html).toContain("You're in, &lt;i&gt;trailrat&lt;/i&gt;.");
    expect(out.html).toContain('href="https://saddleout.com/#join"');
  });
});

describe("saddleout-route-update / -ready", () => {
  const base = {
    eyebrow: "VERSION 1 READY",
    headline: "Tunnel Creek <b>is</b> ready to ride",
    body: "Version 1 is the plain build.",
    buttonLabel: "See your route",
    buttonUrl: "https://saddleout.com/create/abc",
  };
  it("uses every token, escapes the route name, and only the ready one shows a picture", async () => {
    for (const [html, text, tokens] of [
      [SADDLEOUT_ROUTE_UPDATE_HTML, SADDLEOUT_ROUTE_UPDATE_TEXT, SADDLEOUT_ROUTE_UPDATE_TOKENS],
      [SADDLEOUT_ROUTE_READY_HTML, SADDLEOUT_ROUTE_READY_TEXT, SADDLEOUT_ROUTE_READY_TOKENS],
    ] as const) {
      expect(missingTokens(html, tokens)).toEqual([]);
      expect(missingTokens(text, tokens)).toEqual([]);
    }
    expect(templates["saddleout-route-update"].category).toBe("transactional");
    const upd = await renderTemplate("saddleout-route-update", base, "SaddleOut");
    expect(upd.subject).toBe("Tunnel Creek <b>is</b> ready to ride");
    expect(upd.html).toContain("Tunnel Creek &lt;b&gt;is&lt;/b&gt; ready to ride");
    expect(upd.html).not.toContain("<img src=\"https://saddleout.com");
    const ready = await renderTemplate("saddleout-route-ready", { ...base, imageUrl: "https://saddleout.com/api/map-jobs/abc/picture?n=p.jpg&t=x" }, "SaddleOut");
    expect(ready.html).toContain('src="https://saddleout.com/api/map-jobs/abc/picture?n=p.jpg&amp;t=x"');
  });
});

import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates } from "@/emails";
import { renderTemplate } from "@/lib/render";
import { FinancialHealthDailyEmail, derive } from "@/emails/financial-health/daily";

const DATA = { ...FinancialHealthDailyEmail.PreviewProps };
delete (DATA as { appName?: string }).appName;
delete (DATA as { unsubscribeUrl?: string }).unsubscribeUrl;
const UNSUB = "https://money.local/settings/reports?stop=abc";

describe("financial-health-daily", () => {
  it("is a notification — a scheduled digest nobody asked for that morning", () => {
    expect(templates["financial-health-daily"].category).toBe("notification");
  });

  it("puts the whole story in the subject line", async () => {
    const out = await renderTemplate("financial-health-daily", DATA, "Money Mountain", UNSUB);
    // 4,337 budget − 1,980 spent = 2,357 left; 245 over a straight line, which
    // exceeds the 5% band, so the pace reads over.
    expect(out.subject).toBe("Tue Sep 2 · $2,357 left · over pace");
  });

  it("tracks only the discretionary budget and quarantines committed costs", async () => {
    const out = await renderTemplate("financial-health-daily", DATA, "Money Mountain", UNSUB);
    expect(out.html).toContain("$2,357");
    expect(out.html).toContain("Handled, not");
    expect(out.html).toContain("$5,663");
    // The committed total never appears as something to react to: not in the
    // hero, and never added to the spent figure.
    expect(out.html).not.toContain("$7,643"); // 1,980 + 5,663
    expect(out.text).toContain("LEFT THIS MONTH: $2,357");
  });

  it("renders every transaction in both parts, flagging pending and uncategorized", async () => {
    const out = await renderTemplate("financial-health-daily", DATA, "Money Mountain", UNSUB);
    for (const part of [out.html, out.text]) {
      expect(part).toContain("Keckmed");
      expect(part).toContain("Speak Cheezy");
      expect(part).toContain("pending");
    }
    expect(out.html).toContain("categorize");
    expect(out.text).toContain("uncategorized — fix: https://money.local/transactions?fix=1");
    expect(out.text).not.toContain("<");
  });

  it("carries the opt-out in both parts", async () => {
    const out = await renderTemplate("financial-health-daily", DATA, "Money Mountain", UNSUB);
    expect(out.html).toContain(UNSUB);
    expect(out.text).toContain(`Stop the daily report: ${UNSUB}`);
  });

  it("says 'nothing new' rather than rendering an empty table", async () => {
    const out = await renderTemplate("financial-health-daily", { ...DATA, yesterday: [] }, "Money Mountain", UNSUB);
    expect(out.html).toContain("Nothing new.");
    expect(out.text).toContain("Nothing new.");
  });

  it("hides the category bars in the first two days of the month", async () => {
    const out = await renderTemplate("financial-health-daily", { ...DATA, dayOfMonth: 1 }, "Money Mountain", UNSUB);
    expect(out.html).not.toContain("This month by category");
    expect(out.text).not.toContain("THIS MONTH BY CATEGORY");
  });

  it("treats a small drift as on pace", () => {
    // $30 over a straight line on a $4,337 budget is inside the 5% band.
    const d = derive({ discretionaryBudget: 4337, spentMtd: 1765, expectedByToday: 1735, dayOfMonth: 12, daysInMonth: 30 });
    expect(d.pace).toBe("on pace");
    expect(d.daysLeft).toBe(19);
    expect(Math.round(d.perDay)).toBe(Math.round((4337 - 1765) / 19));
  });

  it("rejects malformed data instead of half-rendering it", () => {
    const t = templates["financial-health-daily"];
    expect(t.schema.safeParse({ ...DATA, appUrl: "not a url" }).success).toBe(false);
    expect(t.schema.safeParse({ ...DATA, dayOfMonth: 40 }).success).toBe(false);
    expect(t.schema.safeParse({ ...DATA, spentMtd: "lots" }).success).toBe(false);
    expect(t.schema.safeParse(DATA).success).toBe(true);
  });
});

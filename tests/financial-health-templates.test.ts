import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates } from "@/emails";
import { renderTemplate } from "@/lib/render";
import { FinancialHealthDailyEmail, derive, financialHealthDailySubject } from "@/emails/financial-health/daily";

const { appName: _a, unsubscribeUrl: _u, ...DATA } = FinancialHealthDailyEmail.PreviewProps;
const UNSUB = "https://money.mountain/mail/off";
const render = async (data: Record<string, unknown> = DATA) => {
  const out = await renderTemplate("financial-health-daily", data, "Money Mountain", UNSUB);
  // React separates adjacent text nodes with <!-- -->, which clients ignore.
  return { ...out, html: out.html.replace(/<!--\s*-->/g, "") };
};

describe("financial-health-daily", () => {
  it("is a notification — a scheduled digest nobody asked for that morning", () => {
    expect(templates["financial-health-daily"].category).toBe("notification");
  });

  it("puts the whole story in the subject line, per the handoff's patterns", async () => {
    // Day 15 of 30: $1,880 of $4,337 spent, pace $2,024 — $144 under is
    // inside the 5% band, so the verdict is simply "on pace".
    expect((await render()).subject).toBe("Tue Sep 15 · $2,457 left · on pace");
    // Over pace by a lot names the amount.
    expect((await render({ ...DATA, spent: 2900 })).subject).toBe("Tue Sep 15 · $1,437 left · $876 over pace");
    // Early month: no pace yet, lead with the per-day figure.
    expect((await render({ ...DATA, reportDate: "Wed Sep 2", dayOfMonth: 2, spent: 71 })).subject).toBe("Wed Sep 2 · $4,266 left · $147/day");
    // Over budget: the overage and the days left.
    expect((await render({ ...DATA, reportDate: "Sat Sep 26", dayOfMonth: 20, spent: 4749 })).subject).toBe("Sat Sep 26 · $412 over · 11 days left");
    // Nothing new appends.
    expect((await render({ ...DATA, yesterday: [] })).subject).toBe("Tue Sep 15 · $2,457 left · on pace · nothing new");
  });

  it("tracks only the discretionary budget and quarantines committed costs", async () => {
    const out = await render();
    expect(out.html).toContain("$2,457");
    expect(out.html).toContain("$1,880 of $4,337 spent · pace $2,024");
    expect(out.html).toContain("$144 under");
    expect(out.html).toContain("Handled, not counted.");
    // The committed total never lands in the hero or the spent figure.
    expect(out.html).not.toContain("$7,543"); // 1,880 + 5,663
    expect(out.text).toContain("$2,457 left. $154 a day for 16 days.");
    expect(out.text).toContain("You are $144 under.");
  });

  it("carries the handoff's brand chrome", async () => {
    const out = await render();
    for (const needle of ["#FAFAF2", "#1A1A0F", "#2E6844", "#E8782A", "3px 3px 0 #1A1A0F", "Space Grotesk", "DM Sans", "Open Money Mountain"]) {
      expect(out.html).toContain(needle);
    }
  });

  it("renders every transaction in both parts, with pending, needed and uncategorized", async () => {
    const out = await render();
    for (const part of [out.html, out.text]) {
      expect(part).toContain("Keckmed");
      expect(part).toContain("Speak Cheezy");
      expect(part).toContain("pending");
    }
    expect(out.html).toContain("7 new · $684");
    expect(out.html).toContain("Medical · needed");
    expect(out.html).toContain("Categorize");
    expect(out.html).toContain("https://money.mountain/tx/8841");
    expect(out.text).toContain("Amazon $15 pending, uncategorized");
    expect(out.text).toContain("-> https://money.mountain/tx/8841");
    expect(out.text).not.toContain("<");
  });

  it("marks needed categories grey and lets an over-typical bar fill without a notch", async () => {
    const out = await render();
    expect(out.html).toContain("NEEDED");
    expect(out.html).toContain("#8E8E76");
    expect(out.html).toContain("$505 <span");
    expect(out.text).toContain("Medical* $505 / $210");
    expect(out.text).toContain("* needed");
  });

  it("says 'nothing new' with the sync time rather than rendering an empty table", async () => {
    const out = await render({ ...DATA, yesterday: [] });
    expect(out.html).toContain("0 new");
    expect(out.html).toContain("No transactions. Sync ran at Sep 15, 4:28am.");
    expect(out.text).toContain("YESTERDAY — 0 new");
  });

  it("hides pace and the category card before day 5", async () => {
    const out = await render({ ...DATA, dayOfMonth: 2, spent: 71 });
    expect(out.html).toContain("Pace starts on day 5");
    expect(out.html).not.toContain("This month by category");
    expect(out.html).not.toContain("pace $");
    expect(out.text).not.toContain("THIS MONTH BY CATEGORY");
  });

  it("goes negative and red when the budget is spent, and stops there", async () => {
    const out = await render({ ...DATA, dayOfMonth: 20, spent: 4749 });
    expect(out.html).toContain("−$412");
    expect(out.html).toContain("Over budget · 11 days");
    expect(out.html).toContain("$4,749 spent of $4,337. Nothing left for the rest of the month.");
    expect(out.html).toContain("#C94A3A");
    expect(out.text).toContain("$412 over budget. 11 days left.");
  });

  it("notes a cleared committed bill under Coming up, never in Yesterday", async () => {
    const out = await render({ ...DATA, committedEvents: [{ text: "Property tax $5,000 paid Sep 14 from the set-aside." }] });
    expect(out.html).toContain("Property tax $5,000 paid Sep 14 from the set-aside.");
    expect(out.html).toContain("Committed — outside the budget.");
    expect((await render()).subject).toBe(financialHealthDailySubject({ ...DATA, appName: "Money Mountain" }));
  });

  it("renders the saved-last-month card only when the app supplies it", async () => {
    expect((await render()).html).toContain("Last month you saved");
    expect((await render()).html).toContain("$3,900");
    const { savedLastMonth: _s, ...without } = DATA;
    expect((await render(without)).html).not.toContain("Last month you saved");
  });

  it("carries the opt-out in both parts", async () => {
    const out = await render();
    expect(out.html).toContain(UNSUB);
    expect(out.text).toContain(`Unsubscribe: ${UNSUB}`);
  });

  it("derives pace the way the handoff's numbers do", () => {
    const d = derive({ budget: 4337, spent: 1880, dayOfMonth: 15, daysInMonth: 30, yesterday: [] });
    expect(Math.round(d.paceTarget)).toBe(2024);
    expect(d.daysLeft).toBe(16);
    expect(Math.round(d.perDay)).toBe(154);
    expect(d.spentPct).toBe(43);
    expect(d.notchPct).toBe(47);
    expect(d.verdict).toBe("on pace");
  });

  it("rejects malformed data instead of half-rendering it", () => {
    const t = templates["financial-health-daily"];
    expect(t.schema.safeParse({ ...DATA, appUrl: "not a url" }).success).toBe(false);
    expect(t.schema.safeParse({ ...DATA, dayOfMonth: 40 }).success).toBe(false);
    expect(t.schema.safeParse({ ...DATA, spent: "lots" }).success).toBe(false);
    expect(t.schema.safeParse(DATA).success).toBe(true);
  });
});

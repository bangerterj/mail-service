import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates } from "@/emails";
import { renderTemplate } from "@/lib/render";
import { FinancialHealthMonthlyEmail } from "@/emails/financial-health/monthly";

const { appName: _a, unsubscribeUrl: _u, ...DATA } = FinancialHealthMonthlyEmail.PreviewProps;
const UNSUB = "https://money.mountain/mail/off";
/** React escapes & and ' on the way into HTML; the text part does not. */
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

const render = async (data: Record<string, unknown> = DATA) => {
  const out = await renderTemplate("financial-health-monthly", data, "Money Mountain", UNSUB);
  // React separates adjacent text nodes with <!-- -->, which clients ignore.
  return { ...out, html: out.html.replace(/<!--\s*-->/g, "") };
};

describe("financial-health-monthly", () => {
  it("is a notification — a digest nobody asked for that morning", () => {
    expect(templates["financial-health-monthly"].category).toBe("notification");
  });

  it("puts the verdict in the subject, so it reads unopened", async () => {
    expect((await render()).subject).toBe("September 2026 · $2,909 under budget");
    expect((await render({ ...DATA, headline: "$667 over budget", tone: "warn" })).subject).toBe(
      "September 2026 · $667 over budget"
    );
  });

  it("carries every composed sentence into both parts", async () => {
    const out = await render();
    for (const line of DATA.lines) {
      expect(out.html).toContain(esc(line));
      expect(out.text).toContain(line);
    }
  });

  it("carries the figures into both parts", async () => {
    const out = await render();
    for (const figure of ["$7,091", "$4,941", "$931,042", "Rocket Mortgage"]) {
      expect(out.html).toContain(figure);
      expect(out.text).toContain(figure);
    }
    expect(out.html).toContain(esc("Murphy's Chemo Treatment"));
    expect(out.text).toContain("Murphy's Chemo Treatment");
  });

  it("states which way a mover went, in both parts", async () => {
    const out = await render();
    expect(out.text).toContain("Restaurants & Dining Out: $467 vs a usual $1,539 (-$1,072)");
    expect(out.html).toContain("Restaurants &amp; Dining Out");
  });

  it("names the loss as a loss", async () => {
    const out = await render();
    expect(out.text).toContain("Loss: $390");
    const profitable = await render({ ...DATA, business: { revenue: 2000, expenses: 400, net: 1600 } });
    expect(profitable.text).toContain("Profit: $1,600");
  });

  it("links the month it is about", async () => {
    const out = await render();
    expect(out.html).toContain("https://money.mountain/reports/monthly?month=2026-09");
    expect(out.text).toContain("https://money.mountain/reports/monthly?month=2026-09");
  });

  it("renders the opt-out a notification is required to carry", async () => {
    const out = await render();
    expect(out.html).toContain(UNSUB);
    expect(out.text).toContain(UNSUB);
  });

  it("degrades to omitting sections rather than printing holes", async () => {
    // A household with no paystub for the month has no saved figure and no
    // rate; one with no snapshots has no net worth. Neither is an error.
    const bare = await render({
      ...DATA,
      saved: null,
      savingsRatePct: null,
      afterTaxIncome: null,
      netWorth: null,
      netWorthChange: null,
      budget: null,
      overBudget: null,
      movers: [],
      carveOuts: [],
      business: null,
      biggest: [],
      summary: "$7,091 spent",
      lines: ["Spending was $6,840 lower than the month before (49% down)."],
    });
    for (const part of [bare.html, bare.text]) {
      expect(part).not.toContain("null");
      expect(part).not.toContain("NaN");
      expect(part).not.toContain("undefined");
      expect(part).toContain("$7,091");
    }
    expect(bare.text).not.toContain("WHAT MOVED");
    expect(bare.text).not.toContain("BUSINESS");
  });

  it("rejects data that would render a broken email", async () => {
    const schema = templates["financial-health-monthly"].schema;
    // A month key that is not one.
    expect(schema.safeParse({ ...DATA, month: "Sept 2026" }).success).toBe(false);
    // A charge date that is not a date.
    expect(schema.safeParse({ ...DATA, biggest: [{ name: "X", amount: 1, date: "9/12" }] }).success).toBe(false);
    // A tone the template has no colour for.
    expect(schema.safeParse({ ...DATA, tone: "excellent" }).success).toBe(false);
    // The link is what the email is for.
    expect(schema.safeParse({ ...DATA, viewUrl: "not a url" }).success).toBe(false);
    // Nullable is not optional: the app always states these, even as null.
    const { saved: _s, ...withoutSaved } = DATA;
    expect(schema.safeParse(withoutSaved).success).toBe(false);
    expect(schema.safeParse({ ...DATA, saved: null }).success).toBe(true);
  });
});

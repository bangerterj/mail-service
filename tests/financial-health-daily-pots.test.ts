import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates } from "@/emails";
import { renderTemplate } from "@/lib/render";
import { FinancialHealthDailyEmail } from "@/emails/financial-health/daily";
import { compact, jarBands, type PotsBlock } from "@/emails/financial-health/daily-pots";

const { appName: _a, unsubscribeUrl: _u, ...BASE } = FinancialHealthDailyEmail.PreviewProps;
const UNSUB = "https://money.mountain/mail/off";

/** The handoff's own mock: Sun Oct 11, $5,046 split three ways. */
const POTS: PotsBlock = {
  reader: "Jeff",
  monthBudget: 5_046,
  jars: [
    { key: "Jeff", label: "You", mine: true, budget: 1_682, spent: 107, left: 1_575, paceTarget: 543, diff: -436, verdict: "on pace" },
    { key: "Shared", label: "Shared", mine: false, budget: 1_682, spent: 1_057, left: 625, paceTarget: 543, diff: 514, verdict: "ahead" },
    { key: "Kelli", label: "Kelli", mine: false, budget: 1_682, spent: 780, left: 902, paceTarget: 543, diff: 237, verdict: "a bit ahead" },
  ],
  shared: {
    budget: 1_682,
    spent: 1_057,
    left: 625,
    paceTarget: 543,
    diff: 514,
    perDayToLast: 30,
    runDry: "Oct 22",
    oneOffs: 505,
    oneOffNote: "$505 of it is one-off (Keckmed, 2 charges) — counted once, not spread across the month.",
    whoSpent: [
      { name: "You", amount: 612 },
      { name: "Kelli", amount: 445 },
    ],
  },
  fund: {
    year: 2026,
    seed: 1_500,
    startLabel: "Aug",
    balance: 1_806,
    settledBalance: 1_726,
    added: 492,
    takenOut: 186,
    months: [
      { label: "Aug", delta: 412, projected: false },
      { label: "Sep", delta: -186, projected: false },
      { label: "Oct", delta: 80, projected: true },
      { label: "Nov", delta: null, projected: false },
      { label: "Dec", delta: null, projected: false },
    ],
    note: "Oct is $316 over pace today, but $505 of what's been spent is one-off. Counted once rather than spread across the month, it finishes about $80 under, and the fund ends the month near $1,806.",
  },
  planCheck: {
    year: 2026,
    month: 10,
    savings: {
      verdict: "on track",
      savedToDate: 35_790,
      targetToDate: 34_866,
      target: 3_740,
      span: "Jan–Sep",
      gaps: ["Employer match is counted through Jun 30, the latest plan statement."],
      cells: [
        { label: "J", state: "miss", delta: -530 },
        { label: "F", state: "miss", delta: -350 },
        { label: "M", state: "hit", delta: 310 },
        { label: "A", state: "hit", delta: 140 },
        { label: "M", state: "miss", delta: -130 },
        { label: "J", state: "hit", delta: 460 },
        { label: "J", state: "hit", delta: 200 },
        { label: "A", state: "hit", delta: 380 },
        { label: "S", state: "hit", delta: 240 },
        { label: "O", state: "now", delta: null },
        { label: "N", state: "future", delta: null },
        { label: "D", state: "future", delta: null },
      ],
    },
    spending: {
      verdict: "in balance",
      averageUnder: 102,
      sinceLabel: "Aug",
      cells: [
        ...["J", "F", "M", "A", "M", "J", "J"].map((label) => ({ label, state: "pre" as const, delta: null })),
        { label: "A", state: "hit", delta: 412 },
        { label: "S", state: "miss", delta: -186 },
        { label: "O", state: "now", delta: 80 },
        { label: "N", state: "future", delta: null },
        { label: "D", state: "future", delta: null },
      ],
    },
  },
  charges: [
    {
      group: "Shared",
      total: 639,
      rows: [
        { merchant: "Keckmed", amount: 336, tag: "Shared", note: "Medical, Dental & Vision · needed · Kelli's card → Shared" },
        { merchant: "Grocery Outlet", amount: 71, tag: "Shared", note: "Groceries & Meal Kits · joint card" },
      ],
    },
    { group: "Yours", total: 30, rows: [{ merchant: "Zwift", amount: 20, tag: "You", note: "Gym & Fitness", pending: true }] },
    { group: "Which pot?", total: 15, rows: [{ merchant: "Amazon", amount: 15, tag: "?", note: "joint card", askUrl: "https://money.mountain/cash-flow/transactions?search=Amazon" }] },
  ],
  privacyNote: "Kelli's own spending stays theirs — you only ever see the level of that pot, never what's in it.",
};

const DATA = {
  ...BASE,
  reportDate: "Sun Oct 11",
  dayOfMonth: 11,
  daysInMonth: 31,
  budget: 1_682,
  spent: 107,
  baselinePerDay: 54,
  person: { name: "Jeff", share: 30 },
  pots: POTS,
};
const render = async (data: Record<string, unknown> = DATA) => {
  const out = await renderTemplate("financial-health-daily", data, "Money Mountain", UNSUB);
  return { ...out, html: out.html.replace(/<!--\s*-->/g, "") };
};
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

describe("financial-health-daily — three pots", () => {
  it("accepts the payload the app sends", () => {
    expect(templates["financial-health-daily"].schema.safeParse(DATA).success).toBe(true);
  });

  it("switches to the three-pot layout when pots are present", async () => {
    const out = await render();
    for (const s of ["The household", "Plan check", "Fun fund · 2026", "Shared pot", "New since your last report"]) {
      expect(out.html).toContain(s);
    }
  });

  it("keeps the old layout for a payload without pots", async () => {
    const { pots: _p, ...old } = DATA;
    expect((await render(old)).html).not.toContain("The household");
  });

  it("leads with the reader's own pot", async () => {
    const out = await render();
    expect(out.html).toContain("Jeff · yours to spend");
    expect(out.html).toContain("$1,575");
    expect(out.text).toContain("$1,575 left — $75 a day, on anything you like.");
    expect(out.subject).toBe("Sun Oct 11 · $1,575 left · $436 under pace");
  });

  it("names every jar with what is left and its verdict", async () => {
    const out = await render();
    expect(out.text).toContain("You: $1,575 left of $1,682 · On pace");
    expect(out.text).toContain("Shared: $625 left of $1,682 · $514 ahead of pace");
    expect(out.text).toContain("Kelli: $902 left of $1,682 · A bit ahead");
  });

  it("says an overspent pot is over, once", async () => {
    const over = { ...DATA, pots: { ...POTS, jars: POTS.jars.map((j) => (j.key === "Shared" ? { ...j, spent: 2_523, left: -841, diff: 1_980 } : j)) } };
    const out = await render(over);
    expect(out.text).toContain("Shared: $841 over its $1,682");
    expect(out.html).toContain("over the $1,682");
  });

  it("carries the plan check into both parts", async () => {
    const out = await render();
    expect(out.html).toContain("On track");
    expect(out.html).toContain("In balance");
    // Names the months it scored, rather than claiming "by now".
    expect(out.text).toContain("Savings: on track. $35,790 saved Jan–Sep; plan says $34,866 for those months ($3,740 a month).");
    expect(out.html).toContain("saved Jan–Sep · plan says $34,866 for those months");
    // What is missing is named, not estimated.
    expect(out.text).toContain("Not in yet: Employer match is counted through Jun 30, the latest plan statement.");
    expect(out.text).toContain("Averaging +$102 a month.");
    // Months before the plan are not listed in prose.
    expect(out.text).not.toContain("before the plan");
  });

  it("states the fund, its rule and its reset", async () => {
    const out = await render();
    expect(out.html).toContain("$1,806");
    expect(out.html).toContain("Fund starts again at $1,500");
    expect(out.text).toContain("Dec 31: whatever's left goes to savings. Jan 1: starts again at $1,500.");
  });

  it("calls a fund below zero short", async () => {
    const short = { ...DATA, pots: { ...POTS, fund: { ...POTS.fund, balance: -255 } } };
    const out = await render(short);
    expect(out.html).toContain("Short today");
    expect(out.text).toContain("FUN FUND · 2026 — −$255 short");
  });

  it("gives the shared pot's run-dry date and its daily allowance", async () => {
    const out = await render();
    expect(out.text).toContain("Runs dry around Oct 22. To last the month: $30 a day between you.");
    expect(out.html).toContain(esc(POTS.shared.oneOffNote!));
  });

  it("groups new charges by pot and asks about the uncertain one with a link", async () => {
    const out = await render();
    expect(out.html).toContain("Choose a pot");
    expect(out.html).toContain("https://money.mountain/cash-flow/transactions?search=Amazon");
    expect(out.text).toContain("Choose a pot: https://money.mountain/cash-flow/transactions?search=Amazon");
    expect(out.text).toContain("Keckmed $336 · Medical, Dental & Vision · needed · Kelli's card → Shared");
  });

  it("tells the reader what they will never see", async () => {
    const out = await render();
    expect(out.html).toContain(esc(POTS.privacyNote!));
    expect(out.text).toContain(POTS.privacyNote!);
  });

  it("carries the opt-out a notification needs", async () => {
    const out = await render();
    expect(out.html).toContain(UNSUB);
    expect(out.text).toContain(UNSUB);
  });

  it("rejects a strip cell in a state the template cannot draw", () => {
    const bad = {
      ...DATA,
      pots: { ...POTS, planCheck: { ...POTS.planCheck, spending: { ...POTS.planCheck.spending, cells: [{ label: "J", state: "great", delta: 1 }] } } },
    };
    expect(templates["financial-health-daily"].schema.safeParse(bad).success).toBe(false);
  });
});

describe("jarBands", () => {
  it("splits a jar at the fill line and the pace line, adding up to its height", () => {
    // Jeff's jar on day 11: 93.6% left, the level should be at 68%.
    const bands = jarBands(1_575 / 1_682, 10 / 31, 132);
    expect(bands.reduce((s, b) => s + b.px, 0)).toBe(132);
    expect(bands.map((b) => [b.filled, b.dash])).toEqual([
      [false, false],
      [true, false],
      [true, true],
    ]);
  });

  it("draws an empty jar with the line still in it", () => {
    const bands = jarBands(-0.3, 0.4, 150);
    expect(bands.every((b) => !b.filled)).toBe(true);
    expect(bands.some((b) => b.dash)).toBe(true);
  });

  it("puts the line in the empty part when spending is ahead of pace", () => {
    // 37% left on day 11: the level is below where it should be.
    const bands = jarBands(0.372, 10 / 31, 150);
    expect(bands.find((b) => b.dash)?.filled).toBe(false);
  });
});

describe("compact", () => {
  it("fits a month's figure in a twelfth of the width", () => {
    expect(compact(412)).toBe("+412");
    expect(compact(-186)).toBe("−186");
    expect(compact(2_408)).toBe("+2.4k");
    expect(compact(20_552)).toBe("+21k");
  });
});

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
  describe("carve-outs", () => {
    const CHEMO = {
      ...DATA,
      exceptional: {
        monthTotal: 2140,
        lines: [{ label: "Ruby's chemo", month: 2140, running: 6820, note: "Rise Pet Care, from March" }],
        yesterday: [{ merchant: "Rise Pet Care", amount: 1070, label: "Ruby's chemo" }],
      },
    };

    it("reports the carve-out under its own name, with what it has cost so far", async () => {
      const out = await render(CHEMO);
      expect(out.html).toContain("Set aside from the budget");
      expect(out.html).toContain("Ruby&#x27;s chemo");
      expect(out.html).toContain("$6,820");
      expect(out.text).toContain("Ruby's chemo $2,140 / $6,820");
    });

    it("leaves the budget itself untouched — that is the whole point", async () => {
      const plain = await render();
      const carved = await render(CHEMO);
      // Same limit, same spend, same subject line: the $2,140 changed nothing
      // about what the household is being asked to do differently.
      expect(carved.subject).toBe(plain.subject);
    });

    it("says nothing when there is nothing set aside", async () => {
      expect((await render()).html).not.toContain("Set aside from the budget");
    });

    const HSA = {
      ...DATA,
      exceptional: {
        monthTotal: 505,
        lines: [{ label: "Medical (HSA)", month: 505, running: 4503 }],
        yesterday: [],
        funding: {
          note: "Paid from Lively HSA, which has $4,722 left. About 12 months at $377 a month.",
          action: "You have $2,022 across 13 charges since May 20 still to reimburse.",
        },
      },
    };

    it("carries the nudge to actually claim the money back", async () => {
      const out = await render(HSA);
      expect(out.html).toContain("still to reimburse");
      expect(out.text).toContain(">> You have $2,022 across 13 charges");
    });

    it("draws no progress bar for a pot that is simply draining", async () => {
      // There is no honest "target" to measure an HSA balance against, and a
      // bar with an invented denominator would be decoration posing as fact.
      const out = await render(HSA);
      expect(out.html).not.toContain("Paid for by spending less");
    });
  });

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
    expect(out.html).toContain("over budget · 11 days");
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

describe("a per-person copy", () => {
  // Household discretionary $4,494 split down the middle: $2,247 each.
  // Month to date, joint $1,400, Jeff's own $760, Kelli's own $180.
  // Yesterday, owner-tagged: $472 total, of which $172 is shared. Half of
  // that is $86 each, so Jeff's share is $184 + $20 + $86 = $290 and
  // Kelli's is $96 + $86 = $182. The two add back to $472.
  const YESTERDAY = [
    { merchant: "Jenson USA", amount: 184, category: "Shopping", owner: "Jeff" },
    { merchant: "Free People", amount: 96, category: "Clothing & Apparel", owner: "Kelli" },
    { merchant: "Grocery Outlet", amount: 71, category: "Groceries & Meal Kits" },
    { merchant: "Speak Cheezy", amount: 63, category: "Restaurants & Dining Out" },
    { merchant: "Uber", amount: 23, category: "Rideshare, Transit & Tolls", needed: true },
    { merchant: "Zwift", amount: 20, category: "Gym & Fitness", pending: true, owner: "Jeff" },
    { merchant: "Amazon", amount: 15, category: "General & Online Retail" },
  ];
  const SHARED = { ...DATA, yesterday: YESTERDAY, household: { budget: 4494, spent: 2340 } };
  const JEFF = { ...SHARED, budget: 2247, spent: 1460, person: { name: "Jeff", share: 290 } };
  const KELLI = { ...SHARED, budget: 2247, spent: 880, person: { name: "Kelli", share: 182 } };

  it("gives each person their own hero, pace and subject", async () => {
    const jeff = await render(JEFF);
    const kelli = await render(KELLI);
    // Same day, same household, opposite verdicts — the point of two emails.
    expect(jeff.subject).toBe("Tue Sep 15 · $787 left · $411 over pace");
    expect(kelli.subject).toBe("Tue Sep 15 · $1,367 left · $169 under pace");
    expect(jeff.html).toContain("Jeff, left to spend");
    expect(kelli.html).toContain("Kelli, left to spend");
  });

  it("shows the shared total underneath, so the two copies reconcile", async () => {
    const out = await render(JEFF);
    expect(out.html).toContain("Together you have spent $2,340 of $4,494");
    expect(out.html).toContain("Half of everything shared comes out of each of you.");
    expect(out.text).toContain("Together you have spent $2,340 of $4,494.");
  });

  it("halves add back to the household", () => {
    expect(JEFF.spent + KELLI.spent).toBe(JEFF.household.spent);
    expect(JEFF.budget + KELLI.budget).toBe(JEFF.household.budget);
    expect(JEFF.person.share + KELLI.person.share).toBe(472); // yesterday's $472
  });

  it("names each charge's owner and says what yesterday cost the reader", async () => {
    const out = await render(JEFF);
    expect(out.html).toContain("7 new · $472 · $290 yours");
    expect(out.html).toContain("Jenson USA");
    // Both people's charges are listed — they see everything.
    expect(out.text).toContain("Jenson USA $184 Shopping [Jeff]");
    expect(out.text).toContain("Free People $96 Clothing & Apparel [Kelli]");
    expect(out.html).toContain("Unlabelled charges are shared and count half to each of you.");
  });

  it("still renders the household-wide copy when no person is given", async () => {
    const out = await render();
    expect(out.subject).toBe("Tue Sep 15 · $2,457 left · on pace");
    expect(out.html).not.toContain("Together you have spent");
    expect(out.html).toContain("left to spend");
  });
});

describe("category bars", () => {
  it("draws nothing for a category with no spending", async () => {
    const out = await render({
      ...DATA,
      categories: [
        { name: "Restaurants & Dining Out", spent: 204, typical: 1718 },
        { name: "Hotels & Lodging", spent: 0, typical: 659 },
        { name: "Flights & Airlines", spent: 0, typical: 659 },
      ],
    });
    // A zero-percent cell is not an empty cell: browsers ignore the width and
    // share the row out evenly, which drew an identical green stub on every
    // category that had not been spent on.
    expect(out.html).not.toContain('width="0%"');
    // The one category with spending still draws its share.
    expect(out.html).toContain("$204");
  });

  it("fills past the notch when a category is over its typical month", async () => {
    const out = await render({
      ...DATA,
      categories: [{ name: "Medical, Dental & Vision", spent: 505, typical: 210, needed: true }],
    });
    expect(out.html).toContain("$505");
    expect(out.html).not.toContain('width="0%"');
  });
});

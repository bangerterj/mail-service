import * as React from "react";

/**
 * Money Mountain's daily budget report — sent at 4:30am after the bank sync,
 * read on a phone over coffee.
 *
 * The model behind it: the household sets ONE monthly spend limit. Committed
 * costs (mortgage, property tax, car, utilities, insurance) are stripped from
 * both the limit and the spending, because they are already decided — the
 * report never asks anyone to feel anything about them. What is left is the
 * discretionary budget, and that is the only number this email tracks.
 *
 * Pace beats totals: on day 12 of 30, $1,700 spent is fine and $2,900 is not.
 * The hero therefore shows where you should be against where you are.
 *
 * Voice: a bank statement written by a friend who respects your time. No
 * exclamation marks, no coaching. Numbers without cents, tabular figures.
 *
 * This is the v1 structure. The visual design is being workshopped; when it
 * lands, the markup here changes and the data contract below should not.
 */

export interface DailyTransaction {
  merchant: string;
  amount: number;
  category: string;
  pending?: boolean;
  /** No category yet — rendered as a tappable fix link when `fixUrl` is given. */
  uncategorized?: boolean;
  fixUrl?: string;
}

export interface DailyCategory {
  name: string;
  /** Month-to-date spend. */
  mtd: number;
  /** A typical month: the twelve-month average. */
  typical: number;
  /** Gas, transit, medical, vet — inside the budget but not a choice. */
  needed?: boolean;
}

export interface DailyUpcoming {
  label: string;
  amount: number;
  /** Human phrase: "due Nov 10", "renews in March". */
  due: string;
  setAside: number;
}

export interface FinancialHealthDailyProps {
  appName: string;
  /** "Tue Sep 2" — the day the report covers through. */
  reportDate: string;
  dayOfMonth: number;
  daysInMonth: number;
  /** The limit with committed costs stripped out. */
  discretionaryBudget: number;
  spentMtd: number;
  /** Straight-line expectation for today: budget × day / days. */
  expectedByToday: number;
  /** Everything since the last report. Empty is a real state — say so. */
  yesterday: DailyTransaction[];
  categories: DailyCategory[];
  upcoming: DailyUpcoming[];
  subscriptions: {
    count: number;
    monthlyTotal: number;
    chargedThisMonth: Array<{ merchant: string; amount: number }>;
    priceChanges: Array<{ merchant: string; from: number; to: number }>;
  };
  committed: {
    total: number;
    lines: Array<{ label: string; amount: number }>;
  };
  /** "4:02am" — when the sync this is based on finished. */
  syncedAt: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/** Whole dollars, US grouping. Cents are noise at 6am. */
export function money(n: number): string {
  const rounded = Math.round(Math.abs(n));
  return `${n < 0 ? "-" : ""}$${rounded.toLocaleString("en-US")}`;
}

export function derive(p: Pick<FinancialHealthDailyProps, "discretionaryBudget" | "spentMtd" | "expectedByToday" | "dayOfMonth" | "daysInMonth">) {
  const left = p.discretionaryBudget - p.spentMtd;
  const daysLeft = Math.max(1, p.daysInMonth - p.dayOfMonth + 1);
  const perDay = left / daysLeft;
  const diff = p.spentMtd - p.expectedByToday;
  // Within 5% of budget either way is "on pace" — a $30 dinner should not flip
  // the headline.
  const band = p.discretionaryBudget * 0.05;
  const pace: "on pace" | "over pace" | "under pace" =
    diff > band ? "over pace" : diff < -band ? "under pace" : "on pace";
  return { left, daysLeft, perDay, diff, pace };
}

export function financialHealthDailySubject(p: FinancialHealthDailyProps): string {
  const { left, pace } = derive(p);
  return `${p.reportDate} · ${money(left)} left · ${pace}`;
}

export function FinancialHealthDailyEmail(p: FinancialHealthDailyProps) {
  const d = derive(p);
  const over = d.pace === "over pace";
  const earlyMonth = p.dayOfMonth <= 2;
  const shown = p.categories.filter((c) => c.mtd > 0 || c.typical > 0).slice(0, 8);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>{financialHealthDailySubject(p)}</title>
      </head>
      <body style={body}>
        <table width="100%" border={0} cellSpacing={0} cellPadding={0} style={shell}>
          <tbody>
            {/* Wordmark */}
            <tr>
              <td style={{ padding: "0 0 14px" }}>
                <span style={wordmark}>{p.appName}</span>
                <span style={dateline}>
                  {" "}
                  · {p.reportDate} · day {p.dayOfMonth} of {p.daysInMonth}
                </span>
              </td>
            </tr>

            {/* Hero */}
            <tr>
              <td style={card}>
                <div style={label}>Left this month</div>
                <div style={{ ...hero, color: over ? RED : INK }}>{money(d.left)}</div>
                <div style={sub}>
                  {money(d.perDay)} a day for the next {d.daysLeft} {d.daysLeft === 1 ? "day" : "days"}
                </div>
                <table width="100%" border={0} cellSpacing={0} cellPadding={0} style={{ marginTop: "14px" }}>
                  <tbody>
                    <tr>
                      <td style={paceCell}>
                        <div style={label}>Spent</div>
                        <div style={num}>{money(p.spentMtd)}</div>
                      </td>
                      <td style={paceCell}>
                        <div style={label}>Should be about</div>
                        <div style={num}>{money(p.expectedByToday)}</div>
                      </td>
                      <td style={{ ...paceCell, textAlign: "right" }}>
                        <div style={label}>Pace</div>
                        <div style={{ ...num, color: over ? RED : d.pace === "under pace" ? GREEN : INK }}>
                          {d.pace}
                          {Math.abs(d.diff) > 1 ? ` · ${d.diff > 0 ? "+" : "−"}${money(Math.abs(d.diff))}` : ""}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={fine}>
                  Budget {money(p.discretionaryBudget)} for everything that is a choice. Committed costs
                  are handled separately, below.
                </div>
              </td>
            </tr>

            {/* Yesterday */}
            <tr>
              <td style={section}>
                <div style={h2}>Yesterday</div>
                {p.yesterday.length === 0 ? (
                  <div style={muted}>Nothing new.</div>
                ) : (
                  <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
                    <tbody>
                      {p.yesterday.map((t, i) => (
                        <tr key={i}>
                          <td style={rowMain}>
                            {t.merchant}
                            {t.pending ? <span style={tag}> pending</span> : null}
                          </td>
                          <td style={rowCat}>
                            {t.uncategorized ? (
                              t.fixUrl ? (
                                <a href={t.fixUrl} style={fixLink}>
                                  categorize
                                </a>
                              ) : (
                                <span style={{ color: AMBER }}>uncategorized</span>
                              )
                            ) : (
                              t.category
                            )}
                          </td>
                          <td style={rowAmt}>{money(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </td>
            </tr>

            {/* Categories */}
            {!earlyMonth && shown.length > 0 ? (
              <tr>
                <td style={section}>
                  <div style={h2}>This month by category</div>
                  <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
                    <tbody>
                      {shown.map((c) => {
                        const pct = c.typical > 0 ? Math.min(100, Math.round((c.mtd / c.typical) * 100)) : 0;
                        const hot = c.typical > 0 && c.mtd > c.typical;
                        return (
                          <tr key={c.name}>
                            <td style={{ ...rowMain, width: "44%" }}>
                              {c.name}
                              {c.needed ? <span style={tag}> needed</span> : null}
                            </td>
                            <td style={{ padding: "6px 8px", verticalAlign: "middle" }}>
                              <div style={barTrack}>
                                <div style={{ ...barFill, width: `${pct}%`, backgroundColor: hot ? RED : INK }} />
                              </div>
                            </td>
                            <td style={rowAmt}>
                              {money(c.mtd)}
                              <span style={{ color: MUTED }}> / {money(c.typical)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={fine}>Month to date against a typical month.</div>
                </td>
              </tr>
            ) : null}

            {/* Upcoming */}
            {p.upcoming.length > 0 ? (
              <tr>
                <td style={section}>
                  <div style={h2}>Coming up</div>
                  <table width="100%" border={0} cellSpacing={0} cellPadding={0}>
                    <tbody>
                      {p.upcoming.map((u, i) => (
                        <tr key={i}>
                          <td style={rowMain}>
                            {u.label}
                            <span style={{ color: MUTED }}> · {u.due}</span>
                          </td>
                          <td style={rowAmt}>
                            {money(u.setAside)}
                            <span style={{ color: MUTED }}> of {money(u.amount)} set aside</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : null}

            {/* Subscriptions */}
            <tr>
              <td style={section}>
                <div style={h2}>Subscriptions</div>
                <div style={muted}>
                  {p.subscriptions.count} active, {money(p.subscriptions.monthlyTotal)} a month.
                  {p.subscriptions.chargedThisMonth.length > 0
                    ? ` Charged so far: ${p.subscriptions.chargedThisMonth
                        .map((s) => `${s.merchant} ${money(s.amount)}`)
                        .join(", ")}.`
                    : " Nothing charged yet this month."}
                </div>
                {p.subscriptions.priceChanges.map((c, i) => (
                  <div key={i} style={{ ...muted, color: AMBER }}>
                    {c.merchant} went from {money(c.from)} to {money(c.to)}.
                  </div>
                ))}
              </td>
            </tr>

            {/* Committed — one quiet line */}
            <tr>
              <td style={{ ...section, borderBottom: "none" }}>
                <div style={fine}>
                  {money(p.committed.total)} committed this month —{" "}
                  {p.committed.lines.map((l) => `${l.label} ${money(l.amount)}`).join(", ")}. Handled, not
                  counted.
                </div>
              </td>
            </tr>

            {/* Footer */}
            <tr>
              <td style={{ paddingTop: "18px" }}>
                <a href={p.appUrl} style={button}>
                  Open {p.appName}
                </a>
                <div style={{ ...fine, marginTop: "14px" }}>
                  Based on the sync that finished at {p.syncedAt}.
                  {p.unsubscribeUrl ? (
                    <>
                      {" "}
                      <a href={p.unsubscribeUrl} style={footerLink}>
                        Stop the daily report
                      </a>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function financialHealthDailyText(p: FinancialHealthDailyProps): string {
  const d = derive(p);
  const lines: string[] = [
    `${p.appName} · ${p.reportDate} · day ${p.dayOfMonth} of ${p.daysInMonth}`,
    "",
    `LEFT THIS MONTH: ${money(d.left)}`,
    `${money(d.perDay)} a day for the next ${d.daysLeft} ${d.daysLeft === 1 ? "day" : "days"}`,
    `Spent ${money(p.spentMtd)} · should be about ${money(p.expectedByToday)} · ${d.pace}`,
    `Budget ${money(p.discretionaryBudget)} for everything that is a choice.`,
    "",
    "YESTERDAY",
  ];
  if (p.yesterday.length === 0) lines.push("Nothing new.");
  for (const t of p.yesterday) {
    const cat = t.uncategorized ? `uncategorized${t.fixUrl ? ` — fix: ${t.fixUrl}` : ""}` : t.category;
    lines.push(`- ${t.merchant} ${money(t.amount)} · ${cat}${t.pending ? " (pending)" : ""}`);
  }
  if (p.dayOfMonth > 2 && p.categories.length > 0) {
    lines.push("", "THIS MONTH BY CATEGORY (month to date / typical month)");
    for (const c of p.categories.slice(0, 8)) {
      lines.push(`- ${c.name}${c.needed ? " (needed)" : ""}: ${money(c.mtd)} / ${money(c.typical)}`);
    }
  }
  if (p.upcoming.length > 0) {
    lines.push("", "COMING UP");
    for (const u of p.upcoming) lines.push(`- ${u.label} · ${u.due}: ${money(u.setAside)} of ${money(u.amount)} set aside`);
  }
  lines.push(
    "",
    "SUBSCRIPTIONS",
    `${p.subscriptions.count} active, ${money(p.subscriptions.monthlyTotal)} a month.` +
      (p.subscriptions.chargedThisMonth.length > 0
        ? ` Charged so far: ${p.subscriptions.chargedThisMonth.map((s) => `${s.merchant} ${money(s.amount)}`).join(", ")}.`
        : " Nothing charged yet this month.")
  );
  for (const c of p.subscriptions.priceChanges) lines.push(`${c.merchant} went from ${money(c.from)} to ${money(c.to)}.`);
  lines.push(
    "",
    `${money(p.committed.total)} committed this month — ${p.committed.lines.map((l) => `${l.label} ${money(l.amount)}`).join(", ")}. Handled, not counted.`,
    "",
    `Open ${p.appName}: ${p.appUrl}`,
    `Based on the sync that finished at ${p.syncedAt}.`
  );
  if (p.unsubscribeUrl) lines.push("", `Stop the daily report: ${p.unsubscribeUrl}`);
  return lines.join("\n");
}

// Palette: the app's own — dark green ink, warm paper, red/amber/green for pace.
const INK = "#1f3d2b";
const MUTED = "#7a7f78";
const RED = "#b91c1c";
const AMBER = "#a16207";
const GREEN = "#15803d";
const PAPER = "#f6f3ec";
const CARD = "#ffffff";
const RULE = "#e6e1d6";

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const TABULAR: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

const body: React.CSSProperties = {
  backgroundColor: PAPER,
  color: INK,
  fontFamily: SANS,
  margin: 0,
  padding: "24px 14px",
  lineHeight: 1.45,
};
const shell: React.CSSProperties = { maxWidth: "600px", margin: "0 auto", textAlign: "left" };
const wordmark: React.CSSProperties = { fontSize: "15px", fontWeight: 800, letterSpacing: "-0.3px", color: INK };
const dateline: React.CSSProperties = { fontSize: "12.5px", color: MUTED };
const card: React.CSSProperties = {
  backgroundColor: CARD,
  border: `1px solid ${RULE}`,
  borderRadius: "12px",
  padding: "20px 20px 16px",
};
const label: React.CSSProperties = {
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: MUTED,
  marginBottom: "2px",
};
const hero: React.CSSProperties = { ...TABULAR, fontSize: "40px", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1 };
const sub: React.CSSProperties = { fontSize: "14px", color: INK, marginTop: "4px" };
const num: React.CSSProperties = { ...TABULAR, fontSize: "14px", fontWeight: 600 };
const paceCell: React.CSSProperties = { verticalAlign: "top", padding: "0 8px 0 0" };
const section: React.CSSProperties = { padding: "18px 4px 14px", borderBottom: `1px solid ${RULE}` };
const h2: React.CSSProperties = { fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: INK };
const muted: React.CSSProperties = { fontSize: "13px", color: MUTED };
const fine: React.CSSProperties = { fontSize: "11.5px", color: MUTED, marginTop: "12px", lineHeight: 1.5 };
const rowMain: React.CSSProperties = { fontSize: "13px", padding: "5px 8px 5px 0", verticalAlign: "top" };
const rowCat: React.CSSProperties = { fontSize: "12px", color: MUTED, padding: "5px 8px", verticalAlign: "top" };
const rowAmt: React.CSSProperties = { ...TABULAR, fontSize: "13px", textAlign: "right", padding: "5px 0", whiteSpace: "nowrap", verticalAlign: "top" };
const tag: React.CSSProperties = { fontSize: "10.5px", color: MUTED, textTransform: "uppercase", letterSpacing: "0.4px" };
const fixLink: React.CSSProperties = { color: AMBER, textDecoration: "underline" };
const barTrack: React.CSSProperties = { backgroundColor: RULE, borderRadius: "3px", height: "6px", width: "100%" };
const barFill: React.CSSProperties = { height: "6px", borderRadius: "3px" };
const button: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: INK,
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 600,
  padding: "10px 16px",
  borderRadius: "8px",
};
const footerLink: React.CSSProperties = { color: MUTED, textDecoration: "underline" };

FinancialHealthDailyEmail.PreviewProps = {
  appName: "Money Mountain",
  reportDate: "Tue Sep 2",
  dayOfMonth: 12,
  daysInMonth: 30,
  discretionaryBudget: 4337,
  spentMtd: 1980,
  expectedByToday: 1735,
  yesterday: [
    { merchant: "Keckmed", amount: 336, category: "Medical" },
    { merchant: "Keckmed", amount: 169, category: "Medical" },
    { merchant: "Speak Cheezy", amount: 63, category: "Restaurants" },
    { merchant: "Grocery Outlet", amount: 71, category: "Groceries" },
    { merchant: "Zwift", amount: 20, category: "Gym", pending: true },
    { merchant: "Cloudflare", amount: 10, category: "", uncategorized: true, fixUrl: "https://money.local/transactions?fix=1" },
  ],
  categories: [
    { name: "Online retail", mtd: 612, typical: 1478 },
    { name: "Restaurants", mtd: 540, typical: 1401 },
    { name: "Groceries", mtd: 310, typical: 686 },
    { name: "Entertainment", mtd: 118, typical: 827 },
    { name: "Transit & tolls", mtd: 190, typical: 414, needed: true },
    { name: "Gas", mtd: 96, typical: 279, needed: true },
    { name: "Medical", mtd: 505, typical: 119, needed: true },
  ],
  upcoming: [
    { label: "Property tax", amount: 5000, due: "due Nov 10", setAside: 3333 },
    { label: "Auto insurance", amount: 830, due: "renews in March", setAside: 415 },
  ],
  subscriptions: {
    count: 12,
    monthlyTotal: 307,
    chargedThisMonth: [
      { merchant: "Claude", amount: 200 },
      { merchant: "Netflix", amount: 23 },
    ],
    priceChanges: [],
  },
  committed: {
    total: 5663,
    lines: [
      { label: "mortgage", amount: 2849 },
      { label: "taxes", amount: 882 },
      { label: "car", amount: 744 },
      { label: "utilities", amount: 506 },
      { label: "insurance", amount: 445 },
      { label: "internet", amount: 63 },
    ],
  },
  syncedAt: "4:02am",
  appUrl: "https://money.local/budget",
  unsubscribeUrl: "https://money.local/settings/reports?stop=preview",
} satisfies FinancialHealthDailyProps;

export default FinancialHealthDailyEmail;

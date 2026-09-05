import * as React from "react";

/**
 * Money Mountain's daily budget report — the 4:30am email, read on a phone.
 *
 * Ported from the Claude Design handoff ("Money Mountain Daily Report",
 * direction 1a: pace bar). The markup below follows the handoff table-for-table
 * so it can be diffed against the file the designer signed off; the data
 * contract is the part that stays stable when the design moves.
 *
 * The model: the household sets ONE monthly spend limit. Committed costs
 * (mortgage, property tax, car, utilities, insurance) are stripped from both
 * the limit and the spending, because they are already decided. What is left
 * is the discretionary budget, and it is the only number the hero tracks.
 *
 * Pace beats totals. On day 15 of 30, $1,880 spent is fine and $2,900 is not.
 * The bar shows spend against the budget with a notch at where today should
 * be; before day 5 there is no notch and no verdict, because there is nothing
 * to read yet.
 *
 * Voice: a bank statement written by a friend. No exclamation marks, no
 * second-person imperatives — the copy states the number and stops.
 */

export interface DailyTransaction {
  merchant: string;
  amount: number;
  category: string;
  pending?: boolean;
  /** Gas, transit, medical, vet — inside the budget but not a choice. */
  needed?: boolean;
  /** No category yet. Rendered as a "Categorize" pill when `fixUrl` is given. */
  uncategorized?: boolean;
  fixUrl?: string;
  /** Whose charge it is. Omitted or "Joint" for shared spending. */
  owner?: string;
}

export interface DailyCategory {
  name: string;
  /** Month-to-date. */
  spent: number;
  /** A typical month: the twelve-month average. */
  typical: number;
  needed?: boolean;
}

export interface DailyUpcoming {
  label: string;
  total: number;
  setAside: number;
  /** "Due Dec 10" */
  due: string;
  /** "$833/mo accrued" — optional second phrase after the due date. */
  accrual?: string;
}

/** A committed bill that cleared — noted under Coming up, never in Yesterday. */
export interface CommittedEvent {
  /** "Property tax $5,000 paid Sep 14 from the set-aside." */
  text: string;
}

export interface SavedLastMonth {
  /** "August" */
  month: string;
  lines: Array<{ label: string; amount: number }>;
  total: number;
  /**
   * Optional sentence computed by the app from its own plan — what last
   * month's saving is worth at the retirement date. The template embeds no
   * return or horizon assumptions of its own.
   */
  projection?: string;
  /** "Moved you 0.4% up the mountain. 28.8% to FI." */
  progress?: string;
}

export interface SubscriptionsBlock {
  count: number;
  monthlyTotal: number;
  chargedCount: number;
  chargedTotal: number;
  charged: Array<{
    merchant: string;
    amount: number;
    /** "Sep 4" */
    date?: string;
    /** Previous price, when it changed. */
    priceFrom?: number;
  }>;
  stillToCharge?: { names: string[]; total: number };
}

export interface FinancialHealthDailyProps {
  appName: string;
  /** "Tue Sep 15" */
  reportDate: string;
  dayOfMonth: number;
  daysInMonth: number;
  /** The limit with committed costs stripped out. */
  budget: number;
  /** Discretionary spend month-to-date. */
  spent: number;
  /** budget / days in month — the "$143 a day" the per-day figure is read against. */
  baselinePerDay: number;
  yesterday: DailyTransaction[];
  categories: DailyCategory[];
  upcoming: DailyUpcoming[];
  committedEvents?: CommittedEvent[];
  /**
   * Spending deliberately carved out of the budget above — a course of
   * veterinary chemotherapy, a funeral, a flood. Real money, reported under
   * its own name with a running total, and not counted against the limit:
   * a limit that a one-off makes unmeetable stops being read at all.
   */
  exceptional?: {
    monthTotal: number;
    lines: Array<{
      label: string;
      month: number;
      running: number;
      note?: string;
      /** Set when the carve-out has a known size: 8 treatments, ~$8,000. */
      expectedTotal?: number;
      count?: number;
      expectedCount?: number;
      through?: string;
    }>;
    yesterday: Array<{ merchant: string; amount: number; label: string }>;
    /**
     * How it is being paid for. `note` is composed by the app so the email and
     * the budget page cannot drift into saying different things about the same
     * money. `progress` comes only with a real pair of numbers to draw a bar
     * from — restraint against a known cost. A pot that is simply draining has
     * no meaningful target, and inventing one to get a bar would be decoration
     * standing in for information.
     */
    funding?: {
      note: string;
      progress?: { label: string; current: number; target: number };
      /** The one thing to go and do — a claim that is owed and unfiled. */
      action?: string;
    };
  };
  savedLastMonth?: SavedLastMonth;
  subscriptions: SubscriptionsBlock;
  /**
   * Set when the household sends one copy per person, in which case `budget`
   * and `spent` above are already this person's own: their half of the
   * household budget, and their personal charges plus half of every shared
   * one. The hero is their number, so pace, the bar and the subject all come
   * out personal without special cases.
   *
   * `share` is what yesterday's charges cost this reader specifically —
   * the rows still show what the card was actually charged, because a $71
   * grocery run reading as $36 would not reconcile against a statement.
   */
  person?: { name: string; share: number };
  /** The household total behind a personal hero, for one line of context. */
  household?: { budget: number; spent: number };
  /** One observation, chosen by date so both readers see the same line. */
  dailyLine?: string;
  committed: { total: number; lines: Array<{ label: string; amount: number }> };
  /** "Sep 15, 4:28am" */
  syncedAt: string;
  appUrl: string;
  unsubscribeUrl?: string;
}

/** Whole dollars. Cents are noise at 6am. A true minus sign, not a hyphen. */
export function money(n: number): string {
  const r = Math.round(Math.abs(n));
  return `${n < 0 ? "−" : ""}$${r.toLocaleString("en-US")}`;
}

/** Pace is not readable in the first four days of a month. */
export const PACE_FROM_DAY = 5;

export function derive(p: Pick<FinancialHealthDailyProps, "budget" | "spent" | "dayOfMonth" | "daysInMonth" | "yesterday">) {
  const left = p.budget - p.spent;
  const daysLeft = Math.max(1, p.daysInMonth - p.dayOfMonth + 1);
  const perDay = Math.max(0, left) / daysLeft;
  // Spend through yesterday against days elapsed: on day 15 of 30 you should
  // have spent 14/30 of the budget.
  const paceTarget = (p.budget * (p.dayOfMonth - 1)) / p.daysInMonth;
  const diff = p.spent - paceTarget;
  const paceReadable = p.dayOfMonth >= PACE_FROM_DAY;
  const overBudget = left < 0;
  // Within 5% of the budget either way is "on pace" — one dinner should not
  // flip the subject line.
  const band = p.budget * 0.05;
  const verdict: "on pace" | "over" | "under" = diff > band ? "over" : diff < -band ? "under" : "on pace";
  const spentPct = p.budget > 0 ? Math.min(100, Math.round((p.spent / p.budget) * 100)) : 0;
  const notchPct = p.budget > 0 ? Math.min(100, Math.round((paceTarget / p.budget) * 100)) : 0;
  const newCount = p.yesterday.length;
  const newTotal = p.yesterday.reduce((s, t) => s + t.amount, 0);
  return { left, daysLeft, perDay, paceTarget, diff, paceReadable, overBudget, verdict, spentPct, notchPct, newCount, newTotal };
}

/** "{Day} {Mon} {D} · ${left} left · {verdict}" — the whole story, unopened. */
export function financialHealthDailySubject(p: FinancialHealthDailyProps): string {
  const d = derive(p);
  let tail: string;
  if (d.overBudget) tail = `${money(-d.left)} over · ${d.daysLeft} ${d.daysLeft === 1 ? "day" : "days"} left`;
  else if (!d.paceReadable) tail = `${money(d.left)} left · ${money(d.perDay)}/day`;
  else if (d.verdict === "on pace") tail = `${money(d.left)} left · on pace`;
  else tail = `${money(d.left)} left · ${money(Math.abs(d.diff))} ${d.verdict} pace`;
  return `${p.reportDate} · ${tail}${d.newCount === 0 ? " · nothing new" : ""}`;
}

export function financialHealthDailyPreheader(p: FinancialHealthDailyProps): string {
  const d = derive(p);
  return `${money(d.perDay)}/day for ${d.daysLeft} days · ${d.newCount} new · ${money(d.newTotal)}`;
}

// ─── Tokens, from the app's design handoff ────────────────────────────────
const INK = "#1A1A0F";
const CREAM = "#FAFAF2";
const PAPER = "#EDECDF";
const WHITE = "#FFFFFF";
const FOREST = "#2E6844";
const AMBER = "#E8782A";
const RED = "#C94A3A";
const MUTED = "#6A6A56";
const RULE = "#F0EFE3";
const BAR_GREY = "#8E8E76";

const SANS = "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DISPLAY = "'Space Grotesk', 'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const NUM: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

const T = { role: "presentation", cellPadding: 0, cellSpacing: 0, border: 0 } as const;

const card: React.CSSProperties = {
  width: "100%",
  background: WHITE,
  border: `1.5px solid ${INK}`,
  borderRadius: "12px",
  boxShadow: `3px 3px 0 ${INK}`,
  borderCollapse: "separate",
};
const eyebrow: React.CSSProperties = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: "9.5px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: MUTED,
  paddingBottom: "8px",
};
const h2: React.CSSProperties = { fontFamily: DISPLAY, fontWeight: 700, fontSize: "15px" };
const meta: React.CSSProperties = { ...NUM, fontSize: "11px", color: MUTED };
const rowLabel: React.CSSProperties = { padding: "9px 0", borderBottom: `1px solid ${RULE}`, fontWeight: 600, fontSize: "13.5px", color: INK };
const rowSub: React.CSSProperties = { fontWeight: 400, fontSize: "11px", color: MUTED, paddingTop: "2px" };
const rowAmt: React.CSSProperties = { ...NUM, padding: "9px 0", borderBottom: `1px solid ${RULE}`, fontFamily: DISPLAY, fontWeight: 700, fontSize: "15px", color: INK, whiteSpace: "nowrap" };
const cardHead: React.CSSProperties = { padding: "16px 18px 4px" };
const cardBody: React.CSSProperties = { padding: "4px 18px 16px" };
const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({ fontSize: 0, lineHeight: 0, ...extra });
const fine: React.CSSProperties = { fontSize: "11px", lineHeight: 1.5, color: MUTED };
const needTag: React.CSSProperties = { fontWeight: 700, fontSize: "9.5px", letterSpacing: "0.1em", color: MUTED };
const ownerChip: React.CSSProperties = {
  display: "inline-block",
  marginLeft: "6px",
  padding: "1px 6px",
  borderRadius: "99px",
  fontSize: "9.5px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  border: `1px solid ${RULE}`,
  color: MUTED,
  verticalAlign: "middle",
};
/** The reader's own charges carry a solid chip so their eye lands on them. */
const ownerChipMine: React.CSSProperties = { ...ownerChip, border: `1px solid ${INK}`, color: INK };

function Bar({ fillPct, notchPct, color, height, showNotch }: { fillPct: number; notchPct: number | null; color: string; height: number; showNotch: boolean }) {
  // Fill, gap to the notch, the notch, remainder. Cells rather than divs so
  // Gmail and Outlook draw it; widths as percentages so it scales to 600px.
  //
  // Every cell here is emitted only when it has width. A <td width="0%"> is
  // not an empty cell — browsers ignore a zero percentage and fall back to
  // distributing the row evenly, so a category with nothing spent rendered a
  // green stub the same size as every other empty category's.
  const notch = showNotch && notchPct !== null;
  const before = notch ? Math.min(fillPct, notchPct) : 0;
  const gap = notch ? Math.max(0, notchPct - fillPct) : 0;
  const afterNotch = notch ? Math.max(0, fillPct - notchPct) : 0;
  const remainder = notch ? Math.max(0, 100 - Math.max(fillPct, notchPct)) : 0;
  return (
    <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", border: `${height >= 14 ? 1.5 : 1}px solid ${height >= 14 ? INK : "rgba(26,26,15,0.18)"}`, borderRadius: height >= 14 ? "7px" : "5px", overflow: "hidden" }}>
      <tbody>
        <tr>
          {notch ? (
            <>
              {before > 0 ? <td width={`${before}%`} height={height} style={cell({ background: color })}>&nbsp;</td> : null}
              {gap > 0 ? <td width={`${gap}%`} height={height} style={cell({ background: RULE })}>&nbsp;</td> : null}
              <td width={height >= 14 ? 2 : 1} height={height} style={cell({ background: INK })}>&nbsp;</td>
              {afterNotch > 0 ? <td width={`${afterNotch}%`} height={height} style={cell({ background: color })}>&nbsp;</td> : null}
              {remainder > 0 ? <td height={height} style={cell({ background: RULE })}>&nbsp;</td> : null}
            </>
          ) : (
            <>
              {fillPct > 0 ? <td width={`${fillPct}%`} height={height} style={cell({ background: color })}>&nbsp;</td> : null}
              {fillPct < 100 ? <td height={height} style={cell({ background: RULE })}>&nbsp;</td> : null}
            </>
          )}
        </tr>
      </tbody>
    </table>
  );
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" role="img" aria-label="Money Mountain" style={{ display: "block" }}>
      <rect width="28" height="28" rx="7" fill={AMBER} />
      <g transform="translate(6,6)">
        <path d="M2 14 L8 4 L14 14 Z" fill={WHITE} opacity="0.3" />
        <path d="M4 14 L8 7 L12 14 Z" fill={WHITE} opacity="0.5" />
        <path d="M6 14 L8 10 L10 14 Z" fill={WHITE} />
      </g>
    </svg>
  );
}

export function FinancialHealthDailyEmail(p: FinancialHealthDailyProps) {
  const d = derive(p);
  const heroColor = d.overBudget || (d.paceReadable && d.verdict === "over") ? RED : INK;
  const barColor = d.overBudget || (d.paceReadable && d.verdict === "over") ? RED : FOREST;
  const monthPct = Math.round(((p.dayOfMonth - 1) / p.daysInMonth) * 100);
  const showCategories = d.paceReadable && p.categories.some((c) => c.spent > 0 || c.typical > 0);
  const dayWord = (n: number) => (n === 1 ? "day" : "days");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <title>{financialHealthDailySubject(p)}</title>
      </head>
      <body style={{ margin: 0, padding: "24px 12px", background: PAPER, fontFamily: SANS, color: INK }}>
        {/* Preheader: inbox preview text, invisible in the body. */}
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden", opacity: 0, color: PAPER }}>{financialHealthDailyPreheader(p)}</div>

        <table {...T} width="600" style={{ width: "100%", maxWidth: "600px", margin: "0 auto", background: CREAM, border: `1.5px solid ${INK}`, borderRadius: "12px", boxShadow: `3px 3px 0 ${INK}`, borderCollapse: "separate", fontFamily: SANS }}>
          <tbody>
            {/* Masthead */}
            <tr>
              <td style={{ padding: "16px 20px 14px", borderBottom: `1.5px solid ${INK}` }}>
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td width="26" style={{ verticalAlign: "middle" }}>
                        <Mark />
                      </td>
                      <td style={{ verticalAlign: "middle", fontFamily: DISPLAY, fontWeight: 800, fontSize: "14px", letterSpacing: "-0.3px", color: INK }}>{p.appName}</td>
                      <td align="right" style={{ ...meta, verticalAlign: "middle" }}>
                        {p.reportDate} · day {p.dayOfMonth} of {p.daysInMonth}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Hero — pace bar */}
            <tr>
              <td style={{ padding: "18px 20px 20px" }}>
                <table {...T} width="100%" style={card}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "20px" }}>
                        <div style={eyebrow}>
                          {`${p.person ? `${p.person.name}, ` : ""}${
                            d.overBudget ? "over budget" : "left to spend"
                          } · ${d.daysLeft} ${dayWord(d.daysLeft)}`}
                        </div>
                        <div style={{ ...NUM, fontFamily: DISPLAY, fontWeight: 800, fontSize: "44px", lineHeight: 1, letterSpacing: "-1.6px", color: heroColor }}>{money(d.left)}</div>
                        <div style={{ fontSize: "13px", color: MUTED, paddingTop: "6px" }}>
                          {d.overBudget
                            ? `${money(p.spent)} spent of ${money(p.budget)}. Nothing left for the rest of the month.`
                            : d.paceReadable
                              ? `${money(d.perDay)} a day. Baseline is ${money(p.baselinePerDay)}.`
                              : `${money(d.perDay)} a day. Pace starts on day ${PACE_FROM_DAY} — too early to read.`}
                        </div>
                        {d.paceReadable || d.overBudget ? (
                          <>
                            <div style={{ marginTop: "18px" }}>
                              <Bar fillPct={d.spentPct} notchPct={d.notchPct} color={barColor} height={14} showNotch={d.paceReadable} />
                            </div>
                            <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", marginTop: "7px" }}>
                              <tbody>
                                <tr>
                                  <td style={{ ...NUM, fontSize: "11.5px", color: MUTED }}>
                                    {money(p.spent)} of {money(p.budget)} spent · pace {money(d.paceTarget)}
                                  </td>
                                  <td align="right" style={{ ...NUM, fontFamily: SANS, fontWeight: 700, fontSize: "11.5px", color: d.diff > 0 ? RED : FOREST }}>
                                    {money(Math.abs(d.diff))} {d.diff > 0 ? "over" : "under"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </>
                        ) : null}
                        {p.household ? (
                          <div style={{ ...fine, marginTop: "10px" }}>
                            Together you have spent {money(p.household.spent)} of {money(p.household.budget)}. Half of
                            everything shared comes out of each of you.
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Yesterday */}
            <tr>
              <td style={{ padding: "0 20px 20px" }}>
                <table {...T} width="100%" style={card}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "16px 18px 6px" }}>
                        <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            <tr>
                              <td style={h2}>Yesterday</td>
                              <td align="right" style={meta}>
                                {d.newCount === 0
                                  ? "0 new"
                                  : `${d.newCount} new · ${money(d.newTotal)}${
                                      p.person ? ` · ${money(p.person.share)} yours` : ""
                                    }`}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={cardBody}>
                        {d.newCount === 0 ? (
                          <div style={{ marginTop: "6px", padding: "14px", background: RULE, border: `1.5px solid ${INK}`, borderRadius: "9px", fontSize: "13px", color: INK }}>
                            No transactions. Sync ran at {p.syncedAt}.
                          </div>
                        ) : (
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              {p.yesterday.map((t, i) => {
                                const last = i === p.yesterday.length - 1;
                                const lab = last ? { ...rowLabel, padding: "9px 0 2px", borderBottom: "none" } : rowLabel;
                                const amt = last ? { ...rowAmt, padding: "9px 0 2px", borderBottom: "none" } : rowAmt;
                                return (
                                  <tr key={i}>
                                    <td style={lab}>
                                      {t.merchant}
                                      {t.owner && t.owner !== "Joint" ? (
                                        <span style={t.owner === p.person?.name ? ownerChipMine : ownerChip}>{t.owner}</span>
                                      ) : null}
                                      <div style={{ ...rowSub, paddingTop: t.uncategorized ? "4px" : "2px" }}>
                                        {t.uncategorized ? (
                                          t.fixUrl ? (
                                            <a href={t.fixUrl} style={{ display: "inline-block", background: WHITE, border: `1.5px solid ${INK}`, borderRadius: "99px", padding: "3px 10px", fontFamily: SANS, fontWeight: 700, fontSize: "10.5px", color: AMBER, textDecoration: "none" }}>
                                              Categorize
                                            </a>
                                          ) : (
                                            <span style={{ color: AMBER, fontWeight: 600 }}>uncategorized</span>
                                          )
                                        ) : (
                                          <>
                                            {t.category}
                                            {t.needed ? " · needed" : ""}
                                          </>
                                        )}
                                        {t.pending ? (
                                          <>
                                            {t.uncategorized ? " " : " · "}
                                            <span style={{ paddingLeft: t.uncategorized ? "4px" : 0, color: AMBER, fontWeight: 600 }}>pending</span>
                                          </>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td align="right" style={{ ...amt, color: t.pending ? MUTED : INK }}>
                                      {money(t.amount)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        {p.person && d.newCount > 0 ? (
                          <div style={fine}>
                            Unlabelled charges are shared and count half to each of you. A name means it came off that
                            person&apos;s own card.
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* This month by category */}
            {showCategories ? (
              <tr>
                <td style={{ padding: "0 20px 20px" }}>
                  <table {...T} width="100%" style={card}>
                    <tbody>
                      <tr>
                        <td style={cardHead}>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td style={h2}>This month by category</td>
                                <td align="right" style={{ fontSize: "11px", color: MUTED }}>vs typical month</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      {p.categories.slice(0, 12).map((c) => {
                        const pct = c.typical > 0 ? Math.min(100, Math.round((c.spent / c.typical) * 100)) : c.spent > 0 ? 100 : 0;
                        const over = c.typical > 0 && c.spent > c.typical;
                        return (
                          <tr key={c.name}>
                            <td style={{ padding: "12px 18px 0" }}>
                              <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                                <tbody>
                                  <tr>
                                    <td style={{ fontWeight: 600, fontSize: "13px" }}>
                                      {c.name}
                                      {c.needed ? <span style={needTag}> NEEDED</span> : null}
                                    </td>
                                    <td align="right" style={{ ...NUM, fontFamily: DISPLAY, fontWeight: 700, fontSize: "13px" }}>
                                      {money(c.spent)} <span style={{ fontWeight: 500, color: MUTED }}>/ {money(c.typical)}</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              <div style={{ marginTop: "5px" }}>
                                <Bar fillPct={pct} notchPct={over ? null : monthPct} color={c.needed ? BAR_GREY : FOREST} height={8} showNotch={!over} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td style={{ padding: "12px 18px 16px" }}>
                          <div style={fine}>Notch marks how far through the month you are. Grey bars are needed categories — inside the budget, not a choice.</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : null}

            {/* Set aside from the budget */}
            {p.exceptional && p.exceptional.lines.length > 0 ? (
              <tr>
                <td style={{ padding: "0 20px 20px" }}>
                  <table {...T} width="100%" style={card}>
                    <tbody>
                      <tr>
                        <td style={cardHead}>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td style={h2}>Set aside from the budget</td>
                                <td align="right" style={meta}>this month / so far</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style={cardBody}>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              {p.exceptional.lines.map((l, i) => {
                                const last = i === p.exceptional!.lines.length - 1;
                                const lab = last ? { ...rowLabel, padding: "9px 0 2px", borderBottom: "none" } : rowLabel;
                                const amt = last ? { ...rowAmt, fontSize: "14px", padding: "9px 0 2px", borderBottom: "none" } : { ...rowAmt, fontSize: "14px" };
                                return (
                                  <tr key={l.label}>
                                    <td style={lab}>
                                      {l.label}
                                      {(() => {
                                        const bits = [
                                          l.expectedCount ? `${l.count ?? 0} of ${l.expectedCount}` : null,
                                          l.expectedTotal ? `${money(l.running)} of about ${money(l.expectedTotal)}` : null,
                                          l.through ? `through ${l.through}` : null,
                                          l.note,
                                        ].filter(Boolean);
                                        return bits.length > 0 ? <div style={rowSub}>{bits.join(" · ")}</div> : null;
                                      })()}
                                    </td>
                                    <td align="right" style={amt}>
                                      {money(l.month)} <span style={{ fontWeight: 500, color: MUTED }}>/ {money(l.running)}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {p.exceptional.yesterday.length > 0 ? (
                            <div style={{ marginTop: "12px", fontSize: "12px", lineHeight: 1.5, color: MUTED }}>
                              Yesterday: {p.exceptional.yesterday.map((y) => `${y.merchant} ${money(y.amount)}`).join(", ")}.
                            </div>
                          ) : null}
                          {p.exceptional.funding ? (
                            (() => {
                              const f = p.exceptional!.funding!;
                              const g = f.progress;
                              const pct = g ? Math.min(100, Math.max(0, Math.round((g.current / g.target) * 100))) : 0;
                              const rest = 100 - pct;
                              return (
                                <div style={{ marginTop: "14px" }}>
                                  {g ? (
                                    <>
                                      <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <tbody>
                                          <tr>
                                            <td style={{ fontSize: "11px", color: MUTED, paddingBottom: "4px" }}>{g.label}</td>
                                            <td align="right" style={{ fontSize: "11px", color: MUTED, paddingBottom: "4px" }}>
                                              {money(g.current)} of {money(g.target)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", background: RULE, borderRadius: "5px" }}>
                                        <tbody>
                                          <tr>
                                            {pct > 0 ? <td width={`${pct}%`} height={8} style={cell({ background: FOREST })}>&nbsp;</td> : null}
                                            {rest > 0 ? <td width={`${rest}%`} height={8} style={cell({ background: RULE })}>&nbsp;</td> : null}
                                          </tr>
                                        </tbody>
                                      </table>
                                    </>
                                  ) : null}
                                  <div style={{ marginTop: g ? "8px" : "0", fontSize: "11.5px", lineHeight: 1.6, color: INK }}>{f.note}</div>
                                  {f.action ? (
                                    <div
                                      style={{
                                        marginTop: "10px",
                                        padding: "10px 12px",
                                        background: RULE,
                                        border: `1.5px solid ${INK}`,
                                        borderRadius: "9px",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        lineHeight: 1.5,
                                        color: INK,
                                      }}
                                    >
                                      {f.action}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()
                          ) : (
                            <div style={{ marginTop: "12px", fontSize: "11px", lineHeight: 1.6, color: MUTED }}>
                              Real money, and not counted against the budget above — these are not habits
                              to change. The budget stays where it is so it still means something.
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : null}

            {/* Coming up */}
            {p.upcoming.length > 0 || (p.committedEvents?.length ?? 0) > 0 ? (
              <tr>
                <td style={{ padding: "0 20px 20px" }}>
                  <table {...T} width="100%" style={card}>
                    <tbody>
                      <tr>
                        <td style={cardHead}>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td style={h2}>Coming up</td>
                                <td align="right" style={meta}>set aside / total</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style={cardBody}>
                          {p.upcoming.length > 0 ? (
                            <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                              <tbody>
                                {p.upcoming.map((u, i) => {
                                  const last = i === p.upcoming.length - 1;
                                  const lab = last ? { ...rowLabel, padding: "9px 0 2px", borderBottom: "none" } : rowLabel;
                                  const amt = last ? { ...rowAmt, fontSize: "14px", padding: "9px 0 2px", borderBottom: "none" } : { ...rowAmt, fontSize: "14px" };
                                  return (
                                    <tr key={i}>
                                      <td style={lab}>
                                        {u.label}
                                        <div style={rowSub}>
                                          {u.due}
                                          {u.accrual ? ` · ${u.accrual}` : ""}
                                        </div>
                                      </td>
                                      <td align="right" style={amt}>
                                        {money(u.setAside)} <span style={{ fontWeight: 500, color: MUTED }}>/ {money(u.total)}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : null}
                          {(p.committedEvents ?? []).map((e, i) => (
                            <div key={i} style={{ marginTop: "12px", padding: "10px 12px", background: RULE, border: `1.5px solid ${INK}`, borderRadius: "9px", fontSize: "12px", lineHeight: 1.5, color: INK }}>
                              {e.text} <span style={{ color: MUTED }}>Committed — outside the budget.</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : null}

            {/* Last month you saved */}
            {p.savedLastMonth ? (
              <tr>
                <td style={{ padding: "0 20px 20px" }}>
                  <table {...T} width="100%" style={{ ...card, background: FOREST }}>
                    <tbody>
                      <tr>
                        <td style={cardHead}>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td style={{ ...h2, color: WHITE }}>Last month you saved</td>
                                <td align="right" style={{ ...meta, color: WHITE, opacity: 0.6 }}>{p.savedLastMonth.month}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style={cardBody}>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              {p.savedLastMonth.lines.map((l, i) => (
                                <tr key={i}>
                                  <td style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.16)", fontSize: "13px", color: WHITE, opacity: 0.85 }}>{l.label}</td>
                                  <td align="right" style={{ ...NUM, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.16)", fontFamily: DISPLAY, fontWeight: 700, fontSize: "14px", color: WHITE }}>{money(l.amount)}</td>
                                </tr>
                              ))}
                              <tr>
                                <td style={{ ...eyebrow, padding: "12px 0 0", color: WHITE, opacity: 0.6 }}>Total</td>
                                <td align="right" style={{ ...NUM, padding: "12px 0 0", fontFamily: DISPLAY, fontWeight: 800, fontSize: "26px", letterSpacing: "-0.8px", color: WHITE, lineHeight: 1.1 }}>{money(p.savedLastMonth.total)}</td>
                              </tr>
                            </tbody>
                          </table>
                          {p.savedLastMonth.projection ? (
                            <div style={{ ...NUM, marginTop: "14px", padding: "12px 14px", background: "rgba(255,255,255,0.1)", borderRadius: "9px", fontSize: "12.5px", lineHeight: 1.65, color: WHITE }}>{p.savedLastMonth.projection}</div>
                          ) : null}
                          {p.savedLastMonth.progress ? <div style={{ ...NUM, paddingTop: "10px", fontSize: "11px", color: WHITE, opacity: 0.6 }}>{p.savedLastMonth.progress}</div> : null}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : null}

            {/* Subscriptions */}
            <tr>
              <td style={{ padding: "0 20px 20px" }}>
                <table {...T} width="100%" style={card}>
                  <tbody>
                    <tr>
                      <td style={cardHead}>
                        <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            <tr>
                              <td style={h2}>Subscriptions</td>
                              <td align="right" style={meta}>
                                {p.subscriptions.count} active · {money(p.subscriptions.monthlyTotal)}/mo
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={cardBody}>
                        <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "8px 0", borderBottom: `1px solid ${RULE}`, fontSize: "13px", color: MUTED }}>Charged this month</td>
                              <td align="right" style={{ ...NUM, padding: "8px 0", borderBottom: `1px solid ${RULE}`, fontFamily: DISPLAY, fontWeight: 700, fontSize: "13px" }}>
                                {p.subscriptions.chargedCount} of {p.subscriptions.count} · {money(p.subscriptions.chargedTotal)}
                              </td>
                            </tr>
                            {p.subscriptions.charged.map((s, i) => (
                              <tr key={i}>
                                <td style={{ padding: "8px 0", borderBottom: `1px solid ${RULE}`, fontSize: "13px" }}>
                                  <span style={{ fontWeight: 600 }}>{s.merchant}</span>{" "}
                                  {s.priceFrom != null ? (
                                    <span style={{ color: AMBER, fontWeight: 600 }}>· price up from {money(s.priceFrom)}</span>
                                  ) : s.date ? (
                                    <span style={{ color: MUTED }}>· charged {s.date}</span>
                                  ) : null}
                                </td>
                                <td align="right" style={{ ...NUM, padding: "8px 0", borderBottom: `1px solid ${RULE}`, fontFamily: DISPLAY, fontWeight: 700, fontSize: "13px" }}>{money(s.amount)}</td>
                              </tr>
                            ))}
                            {p.subscriptions.stillToCharge && p.subscriptions.stillToCharge.names.length > 0 ? (
                              <tr>
                                <td style={{ padding: "8px 0 2px", fontSize: "13px", color: MUTED }}>Still to charge: {p.subscriptions.stillToCharge.names.join(", ")}</td>
                                <td align="right" style={{ ...NUM, padding: "8px 0 2px", fontFamily: DISPLAY, fontWeight: 700, fontSize: "13px", color: MUTED }}>{money(p.subscriptions.stillToCharge.total)}</td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Daily line */}
            {p.dailyLine ? (
              <tr>
                <td style={{ padding: "0 20px 20px" }}>
                  <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td width="3" style={cell({ background: AMBER })}>&nbsp;</td>
                        <td style={{ padding: "2px 0 2px 14px", fontSize: "13px", lineHeight: 1.6, color: INK }}>{p.dailyLine}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : null}

            {/* Committed — one quiet line */}
            <tr>
              <td style={{ padding: "0 20px 18px" }}>
                <div style={{ ...NUM, fontSize: "11px", lineHeight: 1.6, color: MUTED }}>
                  {money(p.committed.total)} committed this month — {p.committed.lines.map((l) => `${l.label} ${money(l.amount)}`).join(", ")}. Handled, not counted.
                </div>
              </td>
            </tr>

            {/* Footer */}
            <tr>
              <td style={{ padding: "16px 20px 20px", borderTop: `1.5px solid ${INK}` }}>
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td>
                        <a href={p.appUrl} style={{ display: "inline-block", background: WHITE, border: `1.5px solid ${INK}`, borderRadius: "9px", boxShadow: `3px 3px 0 ${INK}`, padding: "8px 16px", fontFamily: SANS, fontWeight: 500, fontSize: "13px", color: INK, textDecoration: "none" }}>
                          Open {p.appName}
                        </a>
                      </td>
                      <td align="right" style={{ ...NUM, fontSize: "10.5px", lineHeight: 1.6, color: MUTED }}>
                        Synced {p.syncedAt}
                        {p.unsubscribeUrl ? (
                          <>
                            <br />
                            <a href={p.unsubscribeUrl} style={{ color: MUTED, textDecoration: "underline" }}>
                              Unsubscribe
                            </a>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
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
  const dayWord = (n: number) => (n === 1 ? "day" : "days");
  const L: string[] = [`${p.appName.toUpperCase()} — ${p.reportDate}, day ${p.dayOfMonth} of ${p.daysInMonth}`, ""];
  if (p.person) L.push(`For ${p.person.name}`, "");

  if (d.overBudget) {
    L.push(`${money(-d.left)} over budget. ${d.daysLeft} ${dayWord(d.daysLeft)} left.`);
    L.push(`${money(p.spent)} spent of ${money(p.budget)}. Nothing left for the rest of the month.`);
  } else {
    L.push(`${money(d.left)} left. ${money(d.perDay)} a day for ${d.daysLeft} ${dayWord(d.daysLeft)}.`);
    L.push(`Baseline is ${money(p.baselinePerDay)}.`);
    if (d.paceReadable) {
      L.push(`Spent ${money(p.spent)} of ${money(p.budget)}. Pace says ${money(d.paceTarget)}.`);
      L.push(`You are ${money(Math.abs(d.diff))} ${d.diff > 0 ? "over" : "under"}.`);
    } else {
      L.push(`Pace starts on day ${PACE_FROM_DAY} — too early to read.`);
    }
  }

  if (p.household) {
    L.push(
      `Together you have spent ${money(p.household.spent)} of ${money(p.household.budget)}.`,
      "Half of everything shared comes out of each of you."
    );
  }

  L.push(
    "",
    d.newCount === 0
      ? "YESTERDAY — 0 new"
      : `YESTERDAY — ${d.newCount} new, ${money(d.newTotal)}${p.person ? `, ${money(p.person.share)} yours` : ""}`
  );
  if (d.newCount === 0) L.push(`No transactions. Sync ran at ${p.syncedAt}.`);
  for (const t of p.yesterday) {
    const flags = [t.needed ? "needed" : null, t.pending ? "pending" : null].filter(Boolean).join(", ");
    if (t.uncategorized) {
      L.push(`${t.merchant} ${money(t.amount)} ${[t.pending ? "pending" : null, "uncategorized"].filter(Boolean).join(", ")}`);
      if (t.fixUrl) L.push(`-> ${t.fixUrl}`);
    } else {
      const who = t.owner && t.owner !== "Joint" ? ` [${t.owner}]` : "";
      L.push(`${t.merchant} ${money(t.amount)} ${t.category}${flags ? ` (${flags})` : ""}${who}`);
    }
  }

  const cats = p.categories.slice(0, 12);
  if (d.paceReadable && cats.length > 0) {
    L.push("", "THIS MONTH BY CATEGORY (spent / typical month)");
    for (const c of cats) L.push(`${c.name}${c.needed ? "*" : ""} ${money(c.spent)} / ${money(c.typical)}`);
    if (cats.some((c) => c.needed)) L.push("* needed — inside the budget, not a choice.");
    L.push(`${Math.round(((p.dayOfMonth - 1) / p.daysInMonth) * 100)}% of the month has passed.`);
  }

  if (p.exceptional && p.exceptional.lines.length > 0) {
    L.push("", "SET ASIDE FROM THE BUDGET (this month / so far)");
    for (const l of p.exceptional.lines) {
      const bits = [
        l.expectedCount ? `${l.count ?? 0} of ${l.expectedCount}` : null,
        l.through ? `through ${l.through}` : null,
        l.note,
      ].filter(Boolean);
      L.push(`${l.label} ${money(l.month)} / ${money(l.running)}${bits.length ? ` · ${bits.join(" · ")}` : ""}`);
    }
    if (p.exceptional.funding) {
      const g = p.exceptional.funding.progress;
      if (g) L.push(`${g.label}: ${money(g.current)} of ${money(g.target)}.`);
      L.push(p.exceptional.funding.note);
      if (p.exceptional.funding.action) L.push(`>> ${p.exceptional.funding.action}`);
    } else {
      L.push("Real money, and not counted against the budget above.");
    }
  }

  if (p.upcoming.length > 0 || (p.committedEvents?.length ?? 0) > 0) {
    L.push("", "COMING UP (set aside / total)");
    for (const u of p.upcoming) L.push(`${u.label} ${money(u.setAside)} / ${money(u.total)} ${u.due.toLowerCase()}${u.accrual ? ` · ${u.accrual}` : ""}`);
    for (const e of p.committedEvents ?? []) L.push(`${e.text} Committed — outside the budget.`);
  }

  if (p.savedLastMonth) {
    L.push("", `LAST MONTH YOU SAVED — ${p.savedLastMonth.month}`);
    for (const l of p.savedLastMonth.lines) L.push(`${l.label} ${money(l.amount)}`);
    L.push(`Total ${money(p.savedLastMonth.total)}`);
    if (p.savedLastMonth.projection) L.push("", p.savedLastMonth.projection);
    if (p.savedLastMonth.progress) L.push(p.savedLastMonth.progress);
  }

  L.push("", `SUBSCRIPTIONS — ${p.subscriptions.count} active, ${money(p.subscriptions.monthlyTotal)}/mo`);
  L.push(`Charged this month: ${p.subscriptions.chargedCount} of ${p.subscriptions.count}, ${money(p.subscriptions.chargedTotal)}`);
  for (const s of p.subscriptions.charged) {
    L.push(`${s.merchant} ${money(s.amount)}${s.priceFrom != null ? ` — price up from ${money(s.priceFrom)}` : s.date ? `, charged ${s.date}` : ""}`);
  }
  if (p.subscriptions.stillToCharge && p.subscriptions.stillToCharge.names.length > 0) {
    L.push(`Still to charge: ${p.subscriptions.stillToCharge.names.join(", ")} — ${money(p.subscriptions.stillToCharge.total)}`);
  }

  if (p.dailyLine) L.push("", `"${p.dailyLine}"`);

  L.push("", `${money(p.committed.total)} committed this month — ${p.committed.lines.map((l) => `${l.label} ${money(l.amount)}`).join(", ")}. Handled, not counted.`);
  L.push("", `Open ${p.appName}: ${p.appUrl}`, `Based on the sync at ${p.syncedAt}.`);
  if (p.unsubscribeUrl) L.push(`Unsubscribe: ${p.unsubscribeUrl}`);
  return L.join("\n");
}

FinancialHealthDailyEmail.PreviewProps = {
  appName: "Money Mountain",
  reportDate: "Tue Sep 15",
  dayOfMonth: 15,
  daysInMonth: 30,
  budget: 4337,
  spent: 1880,
  baselinePerDay: 143,
  yesterday: [
    { merchant: "Keckmed", amount: 336, category: "Medical", needed: true },
    { merchant: "Keckmed", amount: 169, category: "Medical", needed: true },
    { merchant: "Speak Cheezy", amount: 63, category: "Restaurants" },
    { merchant: "Grocery Outlet", amount: 71, category: "Groceries" },
    { merchant: "Zwift", amount: 20, category: "Gym", pending: true },
    { merchant: "Cloudflare", amount: 10, category: "Utilities" },
    { merchant: "Amazon", amount: 15, category: "", pending: true, uncategorized: true, fixUrl: "https://money.mountain/tx/8841" },
  ],
  categories: [
    { name: "Restaurants", spent: 468, typical: 1401 },
    { name: "Online Retail", spent: 337, typical: 1478 },
    { name: "Medical", spent: 505, typical: 210, needed: true },
    { name: "Groceries", spent: 261, typical: 686 },
    { name: "Shopping", spent: 96, typical: 614 },
    { name: "Gas", spent: 79, typical: 279, needed: true },
    { name: "Transit & Tolls", spent: 74, typical: 414, needed: true },
    { name: "Entertainment", spent: 60, typical: 827 },
  ],
  upcoming: [
    { label: "Property tax", total: 5000, setAside: 3336, due: "Due Dec 10", accrual: "$833/mo accrued" },
    { label: "Auto insurance renewal", total: 1190, setAside: 694, due: "Due Nov 1" },
    { label: "Umbrella policy", total: 410, setAside: 205, due: "Due Jan 15" },
  ],
  savedLastMonth: {
    month: "August",
    lines: [
      { label: "Joint investment", amount: 3000 },
      { label: "Savings", amount: 500 },
      { label: "401(k)", amount: 400 },
    ],
    total: 3900,
    projection: "At 5% real for the 8.75 years to Jun 2035, that $3,900 is $5,976 at the summit — about 1.8 months of retirement spending at a $40,400/yr draw. Every $100 you don't spend today is $153 then.",
    progress: "Moved you 0.4% up the mountain. 28.8% to FI.",
  },
  subscriptions: {
    count: 12,
    monthlyTotal: 307,
    chargedCount: 8,
    chargedTotal: 271,
    charged: [
      { merchant: "Claude", amount: 200, date: "Sep 4" },
      { merchant: "Netflix", amount: 18, priceFrom: 15 },
    ],
    stillToCharge: { names: ["ClassPass", "Strava", "AWS", "Vercel ×2"], total: 36 },
  },
  dailyLine: "Every dollar you save is a piece of your future that you completely own.",
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
  syncedAt: "Sep 15, 4:28am",
  appUrl: "https://money.mountain",
  unsubscribeUrl: "https://money.mountain/mail/off",
} satisfies FinancialHealthDailyProps;

export default FinancialHealthDailyEmail;

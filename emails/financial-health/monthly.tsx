import * as React from "react";

/**
 * Money Mountain's monthly recap — how a finished month went.
 *
 * The daily report tracks pace inside a month; this one closes a month off and
 * does not arrive again for thirty days. So it is mostly sentences: the app
 * composes them (lib/reports/monthly-recap-core.ts) and this places them. The
 * template computes nothing about the money — a second opinion about the month
 * living in an email is exactly the drift the typed contract exists to stop.
 *
 * Same shell as the daily report, same voice: state the number and stop.
 *
 * Tokens are copied from ./daily.tsx rather than imported. That file is the
 * designer's signed-off markup and is left untouched; twelve constants is a
 * cheaper duplication than a refactor of it.
 */

export interface MonthlyMover {
  name: string;
  spent: number;
  typical: number;
  /** Positive is above a typical month. */
  delta: number;
}

export interface MonthlyCarveOut {
  label: string;
  amount: number;
  count: number;
}

export interface MonthlyCharge {
  name: string;
  amount: number;
  /** "2026-09-12" */
  date: string;
}

export interface FinancialHealthMonthlyProps {
  appName: string;
  /** "2026-09" */
  month: string;
  /** "September 2026" */
  monthLabel: string;
  /** "$2,909 under budget" */
  headline: string;
  /** "$7,091 spent · $4,941 saved · a 42% savings rate" */
  summary: string;
  tone: "good" | "warn" | "neutral";
  lines: string[];
  spend: number;
  budget: number | null;
  overBudget: number | null;
  saved: number | null;
  savingsRatePct: number | null;
  afterTaxIncome: number | null;
  netWorth: number | null;
  netWorthChange: number | null;
  movers: MonthlyMover[];
  carveOuts: MonthlyCarveOut[];
  business: { revenue: number; expenses: number; net: number } | null;
  biggest: MonthlyCharge[];
  viewUrl: string;
  unsubscribeUrl?: string;
}

// ─── Tokens, copied from daily.tsx ────────────────────────────────────────
const INK = "#1A1A0F";
const CREAM = "#FAFAF2";
const PAPER = "#EDECDF";
const WHITE = "#FFFFFF";
const FOREST = "#2E6844";
const AMBER = "#E8782A";
const RED = "#C94A3A";
const MUTED = "#6A6A56";
const RULE = "#F0EFE3";

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
const rowLabel: React.CSSProperties = {
  padding: "9px 0",
  borderBottom: `1px solid ${RULE}`,
  fontWeight: 600,
  fontSize: "13.5px",
  color: INK,
};
const rowSub: React.CSSProperties = { fontWeight: 400, fontSize: "11px", color: MUTED, paddingTop: "2px" };
const rowAmt: React.CSSProperties = {
  ...NUM,
  padding: "9px 0",
  borderBottom: `1px solid ${RULE}`,
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: "15px",
  color: INK,
  whiteSpace: "nowrap",
};
const cardHead: React.CSSProperties = { padding: "16px 18px 4px" };
const cardBody: React.CSSProperties = { padding: "4px 18px 16px" };
const fine: React.CSSProperties = { fontSize: "11px", lineHeight: 1.5, color: MUTED };

export const money = (n: number): string =>
  `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

const shortDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

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

export function financialHealthMonthlySubject(p: FinancialHealthMonthlyProps): string {
  // Meant to tell the story unopened: "September 2026 · $2,909 under budget".
  return `${p.monthLabel} · ${p.headline}`;
}

export function financialHealthMonthlyPreheader(p: FinancialHealthMonthlyProps): string {
  return p.summary;
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <tr>
      <td style={{ paddingTop: "14px" }}>
        <table {...T} width="100%" style={card}>
          <tbody>
            <tr>
              <td style={cardHead}>
                <div style={{ ...h2, color: INK }}>{title}</div>
                {note ? <div style={{ ...fine, paddingTop: "3px" }}>{note}</div> : null}
              </td>
            </tr>
            <tr>
              <td style={cardBody}>{children}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

export function FinancialHealthMonthlyEmail(p: FinancialHealthMonthlyProps) {
  const heroColor = p.tone === "warn" ? RED : INK;
  const hasFigures = p.saved != null || p.netWorth != null;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{financialHealthMonthlySubject(p)}</title>
      </head>
      <body style={{ margin: 0, padding: "24px 12px", background: PAPER, fontFamily: SANS, color: INK }}>
        {/* Preheader: inbox preview text, invisible in the body. */}
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden", opacity: 0, color: PAPER }}>
          {financialHealthMonthlyPreheader(p)}
        </div>

        <table
          {...T}
          width="600"
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            background: CREAM,
            border: `1.5px solid ${INK}`,
            borderRadius: "12px",
            boxShadow: `3px 3px 0 ${INK}`,
            borderCollapse: "separate",
            fontFamily: SANS,
          }}
        >
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
                      <td
                        style={{
                          verticalAlign: "middle",
                          fontFamily: DISPLAY,
                          fontWeight: 800,
                          fontSize: "14px",
                          letterSpacing: "-0.3px",
                          color: INK,
                          paddingLeft: "8px",
                        }}
                      >
                        {p.appName}
                      </td>
                      <td style={{ verticalAlign: "middle", textAlign: "right", ...fine }}>Monthly recap</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Hero: the verdict. */}
            <tr>
              <td style={{ padding: "22px 20px 6px" }}>
                <div style={eyebrow}>{p.monthLabel}</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "30px", lineHeight: 1.15, color: heroColor, ...NUM }}>
                  {p.headline}
                </div>
                <div style={{ ...fine, paddingTop: "8px", fontSize: "12.5px" }}>{p.summary}</div>
              </td>
            </tr>

            {/* The sentences, as composed by the app. */}
            <tr>
              <td style={{ padding: "14px 20px 0" }}>
                <table {...T} width="100%" style={card}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "14px 18px" }}>
                        {p.lines.map((line, i) => (
                          <table key={i} {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td
                                  width="12"
                                  style={{ verticalAlign: "top", color: MUTED, fontSize: "13.5px", lineHeight: 1.55, paddingTop: i === 0 ? 0 : "7px" }}
                                >
                                  ·
                                </td>
                                <td
                                  style={{ fontSize: "13.5px", lineHeight: 1.55, color: INK, paddingTop: i === 0 ? 0 : "7px" }}
                                >
                                  {line}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* The figures behind it. Omitted whole when there are none —
                a household with no paystub for the month has no rate. */}
            {hasFigures ? (
              <Card title="The month in figures">
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={rowLabel}>
                        Spent
                        {p.budget != null ? <div style={rowSub}>of {money(p.budget)} budget</div> : null}
                      </td>
                      <td style={{ ...rowAmt, textAlign: "right" }}>{money(p.spend)}</td>
                    </tr>
                    {p.saved != null ? (
                      <tr>
                        <td style={rowLabel}>
                          Saved
                          {p.savingsRatePct != null ? <div style={rowSub}>{p.savingsRatePct}% of what arrived</div> : null}
                        </td>
                        <td style={{ ...rowAmt, textAlign: "right", color: FOREST }}>{money(p.saved)}</td>
                      </tr>
                    ) : null}
                    {p.netWorth != null ? (
                      <tr>
                        <td style={{ ...rowLabel, borderBottom: "none" }}>
                          Net worth
                          {p.netWorthChange != null ? (
                            <div style={rowSub}>
                              {p.netWorthChange >= 0 ? "up" : "down"} {money(p.netWorthChange)} over the month
                            </div>
                          ) : null}
                        </td>
                        <td style={{ ...rowAmt, textAlign: "right", borderBottom: "none" }}>{money(p.netWorth)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </Card>
            ) : null}

            {p.movers.length > 0 ? (
              <Card title="What moved" note="Against a typical month, from the trailing twelve.">
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {p.movers.map((m, i) => {
                      const last = i === p.movers.length - 1;
                      return (
                        <tr key={m.name}>
                          <td style={{ ...rowLabel, ...(last ? { borderBottom: "none" } : {}) }}>
                            {m.name}
                            <div style={rowSub}>
                              {money(m.spent)} against a usual {money(m.typical)}
                            </div>
                          </td>
                          <td
                            style={{
                              ...rowAmt,
                              textAlign: "right",
                              color: m.delta > 0 ? RED : FOREST,
                              ...(last ? { borderBottom: "none" } : {}),
                            }}
                          >
                            {m.delta > 0 ? "+" : "−"}
                            {money(m.delta)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            ) : null}

            {p.carveOuts.length > 0 ? (
              <Card title="Set aside from the budget" note="Real money, never charged to the month.">
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {p.carveOuts.map((c, i) => {
                      const last = i === p.carveOuts.length - 1;
                      return (
                        <tr key={c.label}>
                          <td style={{ ...rowLabel, ...(last ? { borderBottom: "none" } : {}) }}>
                            {c.label}
                            <div style={rowSub}>
                              {c.count} charge{c.count === 1 ? "" : "s"}
                            </div>
                          </td>
                          <td style={{ ...rowAmt, textAlign: "right", ...(last ? { borderBottom: "none" } : {}) }}>
                            {money(c.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            ) : null}

            {p.business ? (
              <Card title="Business">
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={rowLabel}>Revenue</td>
                      <td style={{ ...rowAmt, textAlign: "right" }}>{money(p.business.revenue)}</td>
                    </tr>
                    <tr>
                      <td style={rowLabel}>Expenses</td>
                      <td style={{ ...rowAmt, textAlign: "right" }}>{money(p.business.expenses)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...rowLabel, borderBottom: "none" }}>{p.business.net >= 0 ? "Profit" : "Loss"}</td>
                      <td
                        style={{
                          ...rowAmt,
                          textAlign: "right",
                          borderBottom: "none",
                          color: p.business.net >= 0 ? FOREST : RED,
                        }}
                      >
                        {money(p.business.net)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            ) : null}

            {p.biggest.length > 0 ? (
              <Card title="Largest charges">
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {p.biggest.map((b, i) => {
                      const last = i === p.biggest.length - 1;
                      return (
                        <tr key={`${b.name}-${b.date}-${i}`}>
                          <td style={{ ...rowLabel, ...(last ? { borderBottom: "none" } : {}) }}>
                            {b.name}
                            <div style={rowSub}>{shortDate(b.date)}</div>
                          </td>
                          <td style={{ ...rowAmt, textAlign: "right", ...(last ? { borderBottom: "none" } : {}) }}>
                            {money(b.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            ) : null}

            {/* Bulletproof button, with the URL printed in case it is stripped. */}
            <tr>
              <td style={{ padding: "18px 20px 6px", textAlign: "center" }}>
                <table {...T} style={{ margin: "0 auto", borderCollapse: "separate" }}>
                  <tbody>
                    <tr>
                      <td
                        style={{
                          background: AMBER,
                          border: `1.5px solid ${INK}`,
                          borderRadius: "10px",
                          boxShadow: `2px 2px 0 ${INK}`,
                        }}
                      >
                        <a
                          href={p.viewUrl}
                          style={{
                            display: "inline-block",
                            padding: "11px 22px",
                            fontFamily: DISPLAY,
                            fontWeight: 700,
                            fontSize: "14px",
                            color: WHITE,
                            textDecoration: "none",
                          }}
                        >
                          See the whole month
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Footer */}
            <tr>
              <td style={{ padding: "12px 20px 20px", textAlign: "center" }}>
                <div style={{ ...fine, wordBreak: "break-all" }}>{p.viewUrl}</div>
                {p.unsubscribeUrl ? (
                  <div style={{ ...fine, paddingTop: "8px" }} className="foot">
                    <a href={p.unsubscribeUrl} style={{ color: MUTED, textDecoration: "underline" }}>
                      Stop these emails
                    </a>
                  </div>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function financialHealthMonthlyText(p: FinancialHealthMonthlyProps): string {
  const L: string[] = [`${p.appName.toUpperCase()} — ${p.monthLabel}`, "", p.headline, p.summary, ""];

  for (const line of p.lines) L.push(`· ${line}`);

  const figures: string[] = [`Spent: ${money(p.spend)}${p.budget != null ? ` of ${money(p.budget)} budget` : ""}`];
  if (p.saved != null) {
    figures.push(`Saved: ${money(p.saved)}${p.savingsRatePct != null ? ` (${p.savingsRatePct}% of what arrived)` : ""}`);
  }
  if (p.netWorth != null) {
    figures.push(
      `Net worth: ${money(p.netWorth)}${
        p.netWorthChange != null ? `, ${p.netWorthChange >= 0 ? "up" : "down"} ${money(p.netWorthChange)} over the month` : ""
      }`
    );
  }
  L.push("", "THE MONTH IN FIGURES", ...figures);

  if (p.movers.length > 0) {
    L.push("", "WHAT MOVED (against a typical month)");
    for (const m of p.movers) {
      L.push(`${m.name}: ${money(m.spent)} vs a usual ${money(m.typical)} (${m.delta > 0 ? "+" : "-"}${money(m.delta)})`);
    }
  }

  if (p.carveOuts.length > 0) {
    L.push("", "SET ASIDE FROM THE BUDGET");
    for (const c of p.carveOuts) L.push(`${c.label}: ${money(c.amount)} over ${c.count} charge${c.count === 1 ? "" : "s"}`);
  }

  if (p.business) {
    L.push(
      "",
      "BUSINESS",
      `Revenue: ${money(p.business.revenue)}`,
      `Expenses: ${money(p.business.expenses)}`,
      `${p.business.net >= 0 ? "Profit" : "Loss"}: ${money(p.business.net)}`
    );
  }

  if (p.biggest.length > 0) {
    L.push("", "LARGEST CHARGES");
    for (const b of p.biggest) L.push(`${b.name} — ${money(b.amount)} on ${shortDate(b.date)}`);
  }

  L.push("", `See the whole month: ${p.viewUrl}`);
  if (p.unsubscribeUrl) L.push(`Stop these emails: ${p.unsubscribeUrl}`);
  return L.join("\n");
}

FinancialHealthMonthlyEmail.PreviewProps = {
  appName: "Money Mountain",
  month: "2026-09",
  monthLabel: "September 2026",
  headline: "$2,909 under budget",
  summary: "$7,091 spent · $4,941 saved · a 42% savings rate",
  tone: "good",
  lines: [
    "Spending was $6,840 lower than the month before (49% down).",
    "Restaurants & Dining Out came in $1,072 below its usual $1,539.",
    "$1,359 was set aside from the budget: Murphy's Chemo Treatment $1,359.",
  ],
  spend: 7091,
  budget: 10000,
  overBudget: -2909,
  saved: 4941,
  savingsRatePct: 42,
  afterTaxIncome: 11800,
  netWorth: 931042,
  netWorthChange: 10441,
  movers: [
    { name: "Restaurants & Dining Out", spent: 467, typical: 1539, delta: -1072 },
    { name: "General & Online Retail", spent: 672, typical: 1285, delta: -613 },
  ],
  carveOuts: [{ label: "Murphy's Chemo Treatment", amount: 1359, count: 2 }],
  business: { revenue: 0, expenses: 390, net: -390 },
  biggest: [{ name: "Rocket Mortgage", amount: 2835, date: "2026-09-01" }],
  viewUrl: "https://money.mountain/reports/monthly?month=2026-09",
  unsubscribeUrl: "https://money.mountain/mail/off",
};

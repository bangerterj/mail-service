import * as React from "react";
import type { FinancialHealthDailyProps } from "./daily";

/**
 * The daily report, three-pot edition.
 *
 * Built from the design handoff "Daily report — three pots" (Oct 2026). The
 * household budget is split into Shared and one pot per person; each reader's
 * copy leads with their own pot, shows the level of the others, and never the
 * other person's own charges. Then a plan check, the fun fund, the shared pot
 * in detail, and what is new, grouped by pot.
 *
 * The handoff is a web page; this is email. The jars, strips and fund chart
 * are drawn with table cells rather than positioned divs, gradients become
 * flat fills, and the per-pot buttons on an uncategorised charge are one link
 * into the app — a link in an email that changed data on a single GET would be
 * followed by every scanner and prefetcher that opens the message.
 *
 * Every figure arrives computed. This file places them and formats them; it
 * decides nothing about the money.
 */

// ─── The payload ───────────────────────────────────────────────────────────

export type CellState = "hit" | "miss" | "now" | "pre" | "future" | "none";

export interface PotsJar {
  key: string;
  label: string;
  mine: boolean;
  budget: number;
  spent: number;
  left: number;
  paceTarget: number;
  diff: number;
  verdict: "on pace" | "a bit ahead" | "ahead";
}

export interface PotsStrip {
  verdict: "on track" | "behind" | "in balance" | "out of balance" | "no data";
  /** `value` is the month's actual amount (saved); when present it labels the cell and `delta` only colours it. */
  cells: Array<{ label: string; state: CellState; delta: number | null; value?: number | null }>;
}

export interface PotsBlock {
  reader: string | null;
  monthBudget: number;
  jars: PotsJar[];
  shared: {
    budget: number;
    spent: number;
    left: number;
    paceTarget: number;
    diff: number;
    perDayToLast: number;
    runDry: string | null;
    oneOffs: number;
    oneOffNote: string | null;
    whoSpent: Array<{ name: string; amount: number }>;
  };
  fund: {
    year: number;
    seed: number;
    startLabel: string;
    balance: number;
    settledBalance: number;
    added: number;
    takenOut: number;
    months: Array<{ label: string; delta: number | null; projected: boolean }>;
    note: string;
  };
  planCheck: {
    year: number;
    month: number;
    /** `span` names the months scored — "Jan–Aug" — since unscored months are left out of both sides. */
    savings: (PotsStrip & { savedToDate: number; targetToDate: number; earnedToDate?: number; target: number; span?: string | null; gaps?: string[] }) | null;
    spending: PotsStrip & { averageUnder: number; sinceLabel: string };
  };
  charges: Array<{
    group: string;
    total: number;
    rows: Array<{ merchant: string; amount: number; tag: string; note: string; pending?: boolean; askUrl?: string }>;
  }>;
  privacyNote: string | null;
}

// ─── Tokens: the app's "Lift" surface ──────────────────────────────────────

const BG = "#E9E6DC";
const CREAM = "#F7F5EE";
const SURFACE = "#FFFFFF";
const SUNK = "#EFEDE3";
const INK = "#191A14";
const INK2 = "#55564A";
const INK3 = "#696A59";
const HAIR = "#EFEDE3";
const LINE = "#EBE8DD";
const GREEN = "#2F6B45";
const GREEN_SOFT = "#E8F0E9";
const AMBER = "#B8541A";
const AMBER_D = "#A94B14";
const AMBER_SOFT = "#FCEEE4";
const RED = "#B8402F";
const RED_SOFT = "#FAEAE7";
const BLUE = "#2B5570";
const PRE = "#E6E2D5";

const SANS = "'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DISPLAY = "'Space Grotesk', 'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const NUM: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const T = { role: "presentation", cellPadding: 0, cellSpacing: 0, border: 0 } as const;

const card: React.CSSProperties = {
  width: "100%",
  background: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: "14px",
  boxShadow: "0 1px 1.5px rgba(25,26,20,.035), 0 3px 7px -1px rgba(25,26,20,.055), 0 10px 22px -8px rgba(25,26,20,.07)",
  borderCollapse: "separate",
};
const lbl: React.CSSProperties = { fontFamily: SANS, fontSize: "10px", fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: INK3 };
const h2: React.CSSProperties = { fontFamily: DISPLAY, fontWeight: 700, fontSize: "15px", letterSpacing: "-0.015em", color: INK };
const side: React.CSSProperties = { fontSize: "11.5px", color: INK3 };
const sub: React.CSSProperties = { fontSize: "13.5px", color: INK2, lineHeight: 1.5 };
const small: React.CSSProperties = { ...NUM, fontSize: "11.5px", color: INK3 };
const priv: React.CSSProperties = { background: SUNK, borderRadius: "9px", padding: "10px 12px", fontSize: "12px", color: INK2, lineHeight: 1.5 };

// ─── Formatting ────────────────────────────────────────────────────────────

export const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const plain = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
/** "+$102", "−$877" — for a figure whose direction is the point. */
export const signed = (n: number) => `${n >= 0 ? "+" : "−"}${plain(n)}`;

/** "8.4k", "21k", "545" — an amount rather than a difference, for a strip cell. */
export function short(n: number): string {
  const a = Math.abs(n);
  // One decimal up to $100k, so the cells add up to the headline on a calculator.
  const v = a >= 100_000 ? `${Math.round(a / 1000)}k` : a >= 1_000 ? `${(a / 1000).toFixed(1)}k` : `${Math.round(a)}`;
  return n < 0 ? `−${v}` : v;
}

/** "+412", "−186", "+20.6k" — narrow enough for one of twelve cells. */
export function compact(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  const a = Math.abs(n);
  if (a >= 10_000) return `${sign}${Math.round(a / 1000)}k`;
  if (a >= 1_000) return `${sign}${(a / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(a)}`;
}

/**
 * A stable colour per person, the same in both people's copies: the first
 * name alphabetically is green, the second blue. Shared is always amber.
 */
function colourFor(key: string, jars: PotsJar[]): string {
  if (key === "Shared") return AMBER;
  const people = jars.map((j) => j.key).filter((k) => k !== "Shared").sort();
  return people.indexOf(key) === 0 ? GREEN : BLUE;
}

function verdictText(j: Pick<PotsJar, "verdict" | "diff" | "left">): { text: string; colour: string } {
  if (j.left < 0) return { text: `${plain(j.left)} over`, colour: RED };
  if (j.verdict === "on pace") return { text: "On pace", colour: GREEN };
  if (j.verdict === "a bit ahead") return { text: "A bit ahead", colour: RED };
  return { text: `${plain(j.diff)} ahead of pace`, colour: RED };
}

// ─── Geometry ──────────────────────────────────────────────────────────────

/**
 * A jar as stacked table rows, top to bottom.
 *
 * Two cut points: where the fill starts (what is left, measured from the
 * bottom) and where the level should be today (the dashed line). Whichever
 * comes first from the top splits the jar into up to three bands; a band is
 * filled when it sits below the fill line, and the band that starts at the
 * pace line carries the dash.
 */
export function jarBands(leftFrac: number, elapsedFrac: number, height: number): Array<{ px: number; filled: boolean; dash: boolean }> {
  const fill = Math.min(1, Math.max(0, leftFrac));
  const emptyTop = 1 - fill;
  const paceTop = Math.min(1, Math.max(0, elapsedFrac));
  const cuts = [...new Set([0, emptyTop, paceTop, 1])].sort((a, b) => a - b);
  const bands: Array<{ px: number; filled: boolean; dash: boolean }> = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    // Round the positions, not the lengths: rounded lengths drift by a pixel,
    // and jars that should match then stand at different heights.
    const px = Math.round(cuts[i + 1] * height) - Math.round(cuts[i] * height);
    if (px <= 0) continue;
    bands.push({ px, filled: cuts[i] >= emptyTop - 1e-9, dash: Math.abs(cuts[i] - paceTop) < 1e-9 && paceTop > 0 });
  }
  return bands;
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function Card({ children, pad = "18px" }: { children: React.ReactNode; pad?: string }) {
  return (
    <tr>
      <td style={{ paddingTop: "12px" }}>
        <table {...T} width="100%" style={card}>
          <tbody>
            <tr>
              <td style={{ padding: pad }}>{children}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function CardHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
      <tbody>
        <tr>
          <td style={h2}>{title}</td>
          {aside ? <td align="right" style={{ ...side, ...NUM }}>{aside}</td> : null}
        </tr>
      </tbody>
    </table>
  );
}

/** All three pots together — the figure the jars don't give at a glance. */
export function householdTotals(pots: PotsBlock): { spent: number; pace: number; left: number; diff: number } {
  const spent = pots.jars.reduce((t, j) => t + j.spent, 0);
  const pace = pots.jars.reduce((t, j) => t + j.paceTarget, 0);
  return { spent, pace, left: pots.monthBudget - spent, diff: spent - pace };
}

/** A progress bar with a pace notch, as cells: fill, gap, notch, rest. */
function Bar({ frac, paceFrac, colour }: { frac: number; paceFrac: number; colour: string }) {
  const f = Math.round(Math.min(1, Math.max(0, frac)) * 100);
  const p = Math.round(Math.min(1, Math.max(0, paceFrac)) * 100);
  const cells: Array<{ w: number; bg: string; notch?: boolean }> = [];
  if (f <= p) {
    if (f > 0) cells.push({ w: f, bg: colour });
    if (p - f > 0) cells.push({ w: p - f, bg: SUNK });
    cells.push({ w: 0, bg: INK, notch: true });
    if (100 - p > 0) cells.push({ w: 100 - p, bg: SUNK });
  } else {
    if (p > 0) cells.push({ w: p, bg: colour });
    cells.push({ w: 0, bg: INK, notch: true });
    cells.push({ w: f - p, bg: colour });
    if (100 - f > 0) cells.push({ w: 100 - f, bg: SUNK });
  }
  return (
    <table {...T} width="100%" style={{ width: "100%", borderCollapse: "separate", marginTop: "15px", borderRadius: "99px", overflow: "hidden", background: SUNK }}>
      <tbody>
        <tr>
          {cells.map((c, i) => (
            <td
              key={i}
              width={c.notch ? 2 : `${c.w}%`}
              style={{ height: "12px", lineHeight: 0, fontSize: 0, background: c.bg, ...(c.notch ? { width: "2px" } : {}) }}
            >
              &nbsp;
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function BarLegend({ left, right, rightColour }: { left: string; right: string; rightColour: string }) {
  return (
    <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", marginTop: "7px" }}>
      <tbody>
        <tr>
          <td style={small}>{left}</td>
          <td align="right" style={{ ...small, color: rightColour, fontWeight: 700 }}>{right}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Jar({ jar, colour, elapsedFrac, height }: { jar: PotsJar; colour: string; elapsedFrac: number; height: number }) {
  const bands = jarBands(jar.budget > 0 ? jar.left / jar.budget : 0, elapsedFrac, height);
  const v = verdictText(jar);
  return (
    <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        <tr>
          <td align="center">
            <table {...T} width="100%" style={{ width: "100%", maxWidth: height > 130 ? "150px" : "120px", borderCollapse: "separate", border: "1px solid #E3DFD2", borderRadius: "12px 12px 16px 16px", overflow: "hidden" }}>
              <tbody>
                {bands.map((b, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        height: `${b.px}px`,
                        lineHeight: 0,
                        fontSize: 0,
                        background: b.filled ? colour : SUNK,
                        ...(b.dash ? { borderTop: `2px dashed ${INK}` } : {}),
                      }}
                    >
                      &nbsp;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style={{ ...NUM, fontFamily: DISPLAY, fontSize: "21px", fontWeight: 700, letterSpacing: "-0.03em", paddingTop: "9px", color: jar.left < 0 ? RED : INK }}>
            {money(jar.left)}
          </td>
        </tr>
        <tr>
          <td align="center" style={{ fontWeight: 700, fontSize: "13px", paddingTop: "6px", color: INK }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: colour, marginRight: "6px" }} />
            {jar.label}
          </td>
        </tr>
        <tr>
          <td align="center" style={{ ...small, fontSize: "11px", paddingTop: "2px" }}>
            {jar.left < 0 ? `over the ${plain(jar.budget)}` : `left of ${plain(jar.budget)}`}
          </td>
        </tr>
        <tr>
          <td align="center" style={{ fontSize: "11px", fontWeight: 700, paddingTop: "4px", color: v.colour }}>
            {v.text}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Pill({ ok, text }: { ok: boolean | null; text: string }) {
  const c = ok == null ? INK3 : ok ? GREEN : RED;
  const bg = ok == null ? SUNK : ok ? GREEN_SOFT : RED_SOFT;
  return (
    <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "4px 10px", borderRadius: "99px", whiteSpace: "nowrap", color: c, background: bg }}>
      {text}
    </span>
  );
}

function cellStyle(state: CellState): React.CSSProperties {
  const base: React.CSSProperties = { height: "22px", borderRadius: "5px", lineHeight: 0, fontSize: 0 };
  switch (state) {
    case "hit":
      return { ...base, background: GREEN };
    case "miss":
      return { ...base, background: RED };
    case "now":
      return { ...base, background: SURFACE, border: `1.5px solid ${GREEN}` };
    case "pre":
      return { ...base, background: PRE };
    case "none":
      return { ...base, background: SURFACE, border: `1px dashed #D9D5C6` };
    default:
      return { ...base, background: SUNK };
  }
}

function Strip({ strip }: { strip: PotsStrip }) {
  return (
    <>
      <table {...T} width="100%" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "4px 0", marginTop: "12px", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            {strip.cells.map((c, i) => (
              <td key={i} style={cellStyle(c.state)}>
                &nbsp;
              </td>
            ))}
          </tr>
          <tr>
            {strip.cells.map((c, i) => (
              <td key={i} align="center" style={{ ...NUM, fontSize: "9.5px", color: INK3, paddingTop: "4px", verticalAlign: "top" }}>
                {c.label}
                {c.value != null ? (
                  <div style={{ fontFamily: DISPLAY, fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", color: INK, letterSpacing: "-0.03em" }}>
                    {short(c.value)}
                  </div>
                ) : c.delta != null ? (
                  <div style={{ fontFamily: DISPLAY, fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", color: c.delta >= 0 ? GREEN : RED, letterSpacing: "-0.03em" }}>
                    {compact(c.delta)}
                  </div>
                ) : null}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}

function FundChart({ months }: { months: PotsBlock["fund"]["months"] }) {
  const max = Math.max(1, ...months.map((m) => Math.abs(m.delta ?? 0)));
  const H = 56;
  // A half with nothing in it is not drawn: with no month over budget yet, an
  // empty band below the line only pushes the labels away from their bars.
  const upH = months.some((m) => (m.delta ?? 0) > 0) ? H : 0;
  const downH = months.some((m) => (m.delta ?? 0) < 0) ? H : 0;
  const bar = (m: (typeof months)[number], up: boolean) => {
    const d = m.delta ?? 0;
    const px = (d > 0) === up && d !== 0 ? Math.max(3, Math.round((Math.abs(d) / max) * H)) : 0;
    if (px === 0) return null;
    const bg = !up ? RED : m.projected ? GREEN_SOFT : GREEN;
    return (
      <table {...T} width="76%" align="center" style={{ width: "76%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ height: `${px}px`, lineHeight: 0, fontSize: 0, background: bg, ...(m.projected ? { border: "1px solid #9CBFA5" } : {}), borderRadius: up ? "4px 4px 0 0" : "0 0 4px 4px" }}>
              &nbsp;
            </td>
          </tr>
        </tbody>
      </table>
    );
  };
  return (
    <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", marginTop: "18px", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          {months.map((m, i) => (
            <td key={i} style={{ height: `${upH}px`, verticalAlign: "bottom" }}>
              {bar(m, true)}
            </td>
          ))}
        </tr>
        <tr>
          {months.map((_, i) => (
            <td key={i} style={{ height: "1px", lineHeight: 0, fontSize: 0, background: "#D9D5C6" }}>
              &nbsp;
            </td>
          ))}
        </tr>
        <tr>
          {months.map((m, i) => (
            <td key={i} style={{ height: `${downH}px`, verticalAlign: "top" }}>
              {bar(m, false)}
            </td>
          ))}
        </tr>
        <tr>
          {months.map((m, i) => (
            <td key={i} align="center" style={{ ...NUM, fontSize: "9.5px", color: m.projected ? INK : INK3, fontWeight: m.projected ? 700 : 400, paddingTop: "6px" }}>
              {m.label}
              {m.delta != null ? (
                <div style={{ fontFamily: DISPLAY, fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", color: m.delta >= 0 ? GREEN : RED }}>
                  {m.projected ? "≈ " : ""}
                  {compact(m.delta)}
                </div>
              ) : null}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 30 30" role="img" aria-label="Money Mountain" style={{ display: "block" }}>
      <rect width="30" height="30" rx="8" fill={AMBER} />
      <path d="M5 25 15 7l10 18z" fill="#fff" opacity=".25" />
      <path d="M8 25 15 11l7 14z" fill="#fff" opacity=".35" />
      <path d="M11 25 15 15l4 10z" fill="#fff" />
    </svg>
  );
}

// ─── The email ─────────────────────────────────────────────────────────────

export function FinancialHealthDailyPotsEmail(p: FinancialHealthDailyProps & { pots: PotsBlock }) {
  const pots = p.pots;
  const daysLeft = Math.max(1, p.daysInMonth - p.dayOfMonth + 1);
  const elapsedFrac = Math.max(0, p.dayOfMonth - 1) / p.daysInMonth;
  const household = householdTotals(pots);
  const mine = pots.jars.find((j) => j.mine) ?? pots.jars[0];
  const myColour = colourFor(mine.key, pots.jars);
  const perDay = Math.max(0, mine.left) / daysLeft;
  const sh = pots.shared;
  const pc = pots.planCheck;
  const fund = pots.fund;
  const newCount = pots.charges.reduce((s, g) => s + g.rows.length, 0);
  const newTotal = pots.charges.reduce((s, g) => s + g.total, 0);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: "28px 12px 48px", background: BG, fontFamily: SANS, color: INK }}>
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden", opacity: 0, color: BG }}>
          {`${money(mine.left)} yours to spend · Shared ${sh.left < 0 ? `${plain(sh.left)} over` : `${plain(sh.left)} left`} · fun fund ${money(fund.balance)}`}
        </div>
        <table {...T} width="600" align="center" style={{ width: "100%", maxWidth: "600px", margin: "0 auto", background: CREAM, borderRadius: "16px", borderCollapse: "separate", overflow: "hidden" }}>
          <tbody>
            {/* Header */}
            <tr>
              <td style={{ padding: "16px 20px", background: SURFACE, borderBottom: "1px solid #E8E5DA" }}>
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td width="30" style={{ verticalAlign: "middle" }}>
                        <Mark />
                      </td>
                      <td style={{ verticalAlign: "middle", fontFamily: DISPLAY, fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em", paddingLeft: "9px" }}>{p.appName}</td>
                      <td align="right" style={{ ...NUM, verticalAlign: "middle", fontSize: "12px", color: INK3 }}>
                        {p.reportDate} · day {p.dayOfMonth} of {p.daysInMonth}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style={{ padding: "4px 16px 16px" }}>
                <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {/* 1 · Your pot */}
                    <Card>
                      <div style={lbl}>
                        {pots.reader ? `${pots.reader} · yours to spend` : "Your pot"} · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                      </div>
                      <div style={{ ...NUM, fontFamily: DISPLAY, fontWeight: 700, fontSize: "46px", letterSpacing: "-0.045em", lineHeight: 1, marginTop: "8px", color: mine.left < 0 ? RED : INK }}>
                        {money(mine.left)}
                      </div>
                      <div style={{ ...sub, ...NUM, marginTop: "7px" }}>
                        {mine.left < 0 ? (
                          <>Over for the month. It comes back on the 1st.</>
                        ) : (
                          <>
                            <b style={{ color: INK }}>{plain(perDay)} a day</b>, on anything you like.
                          </>
                        )}
                      </div>
                      <Bar frac={mine.budget > 0 ? mine.spent / mine.budget : 0} paceFrac={elapsedFrac} colour={myColour} />
                      <BarLegend
                        left={`${plain(mine.spent)} of ${plain(mine.budget)} spent · pace ${plain(mine.paceTarget)}`}
                        right={`${plain(mine.diff)} ${mine.diff > 0 ? "over" : "under"} pace`}
                        rightColour={mine.diff > 0 ? RED : GREEN}
                      />
                    </Card>

                    {/* 2 · The household */}
                    <Card>
                      <CardHead title="The household" aside={`${plain(pots.monthBudget)} a month · split in thirds`} />
                      <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td style={{ fontSize: "13.5px", color: "#55564A" }}>
                              <b style={{ fontSize: "19px", color: INK, letterSpacing: "-0.02em" }}>{plain(household.spent)}</b> spent of {plain(pots.monthBudget)}
                            </td>
                            <td align="right" style={{ fontSize: "13px", fontWeight: 700, color: household.left < 0 ? RED : INK }}>
                              {household.left < 0 ? `${plain(-household.left)} over` : `${plain(household.left)} left`}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <Bar frac={pots.monthBudget > 0 ? household.spent / pots.monthBudget : 0} paceFrac={elapsedFrac} colour={INK3} />
                      <BarLegend
                        left={`All three pots · pace ${plain(household.pace)}`}
                        right={`${plain(Math.abs(household.diff))} ${household.diff > 0 ? "over" : "under"} pace`}
                        rightColour={household.diff > 0 ? RED : GREEN}
                      />
                      <div style={{ height: "16px", lineHeight: "16px", fontSize: 0 }}>&nbsp;</div>
                      <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <tbody>
                          <tr>
                            {pots.jars.map((j) => (
                              <td key={j.key} width={j.key === "Shared" ? "38%" : "31%"} style={{ verticalAlign: "bottom", padding: "0 5px" }}>
                                <Jar jar={j} colour={colourFor(j.key, pots.jars)} elapsedFrac={elapsedFrac} height={j.key === "Shared" ? 150 : 132} />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                      <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${HAIR}`, fontSize: "11.5px", color: INK3, lineHeight: 1.5 }}>
                        <span style={{ display: "inline-block", width: "14px", borderTop: `2px dashed ${INK}`, verticalAlign: "middle", marginRight: "6px", opacity: 0.55 }} />
                        where the level should be today · Fill is what&apos;s left — it drains as you spend.
                      </div>
                    </Card>

                    {/* 3 · Plan check */}
                    <Card>
                      <CardHead title="Plan check" aside={`${pc.year} · month ${pc.month} of 12`} />
                      {pc.savings ? (
                        <div style={{ paddingBottom: "14px", borderBottom: `1px solid ${HAIR}` }}>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td>
                                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "14px" }}>Savings</div>
                                  <div style={{ ...NUM, fontSize: "12.5px", color: INK2, marginTop: "1px" }}>
                                    <b style={{ color: INK }}>{plain(pc.savings.savedToDate)}</b> saved
                                    {pc.savings.earnedToDate ? ` of ${plain(pc.savings.earnedToDate)} that came in · ${Math.round((pc.savings.savedToDate / pc.savings.earnedToDate) * 100)}%` : ""}
                                    {pc.savings.span ? <span style={{ color: INK3 }}>{` · ${pc.savings.span}`}</span> : null}
                                  </div>
                                </td>
                                <td align="right" style={{ verticalAlign: "top" }}>
                                  <Pill ok={pc.savings.verdict === "no data" ? null : pc.savings.verdict === "on track"} text={pc.savings.verdict === "on track" ? "On track" : pc.savings.verdict === "behind" ? "Behind" : "No data yet"} />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <Strip strip={pc.savings} />
                          <div style={{ ...NUM, fontSize: "12.5px", color: INK2, lineHeight: 1.5, marginTop: "9px" }}>
                            The plan needs {plain(pc.savings.target)} a month to keep the retirement date — {plain(pc.savings.targetToDate)} for these months, so{" "}
                            {pc.savings.savedToDate >= pc.savings.targetToDate ? `${plain(pc.savings.savedToDate - pc.savings.targetToDate)} ahead` : `${plain(pc.savings.targetToDate - pc.savings.savedToDate)} short`}. Green months met it.
                            {pc.savings.gaps?.length ? ` Not in yet: ${pc.savings.gaps.join(" ")}` : ""}
                          </div>
                        </div>
                      ) : null}
                      <div style={{ paddingTop: pc.savings ? "14px" : 0 }}>
                        <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            <tr>
                              <td>
                                <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: "14px" }}>Spending</div>
                                <div style={{ ...small, marginTop: "1px" }}>
                                  all three pots · {plain(pots.monthBudget)} a month · since {pc.spending.sinceLabel}
                                </div>
                              </td>
                              <td align="right" style={{ verticalAlign: "top" }}>
                                <Pill
                                  ok={pc.spending.verdict === "no data" ? null : pc.spending.verdict === "in balance"}
                                  text={pc.spending.verdict === "in balance" ? "In balance" : pc.spending.verdict === "out of balance" ? "Out of balance" : "No data yet"}
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <Strip strip={pc.spending} />
                        <div style={{ ...NUM, fontSize: "12.5px", color: INK2, lineHeight: 1.5, marginTop: "9px" }}>
                          Over or under the plan each month since pots began; this month is projected.{" "}
                          {pc.spending.verdict === "no data" ? null : (
                            <>
                              Averaging <b style={{ color: INK }}>{signed(pc.spending.averageUnder)} a month</b>, so the fun fund is {pc.spending.averageUnder >= 0 ? "growing" : "shrinking"}.
                              {pc.spending.verdict === "out of balance" ? " At that rate it empties before December 31." : ""}
                            </>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* 4 · Fun fund */}
                    <Card>
                      <CardHead title={`Fun fund · ${fund.year}`} aside="trips, toys, anything · resets Jan 1" />
                      <table {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td style={{ verticalAlign: "bottom" }}>
                              <div style={lbl}>{fund.balance < 0 ? "Short today" : "Balance today"}</div>
                              <div style={{ ...NUM, fontFamily: DISPLAY, fontWeight: 700, fontSize: "40px", letterSpacing: "-0.045em", lineHeight: 1, marginTop: "6px", color: fund.balance < 0 ? RED : GREEN }}>
                                {money(fund.balance)}
                              </div>
                            </td>
                            <td align="right" style={{ verticalAlign: "bottom" }}>
                              <table {...T} style={{ borderCollapse: "collapse", fontSize: "12px" }}>
                                <tbody>
                                  <tr>
                                    <td style={{ color: INK3, paddingRight: "14px" }}>Started {fund.startLabel} with</td>
                                    <td align="right" style={{ ...NUM, fontFamily: DISPLAY, fontWeight: 700 }}>{plain(fund.seed)}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ color: INK3, paddingRight: "14px", paddingTop: "3px" }}>Months under budget</td>
                                    <td align="right" style={{ ...NUM, fontFamily: DISPLAY, fontWeight: 700, color: fund.added > 0 ? GREEN : INK3, paddingTop: "3px" }}>
                                      {fund.added > 0 ? `+${plain(fund.added)}` : "$0"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={{ color: INK3, paddingRight: "14px", paddingTop: "3px" }}>Months over budget</td>
                                    <td align="right" style={{ ...NUM, fontFamily: DISPLAY, fontWeight: 700, color: fund.takenOut > 0 ? RED : INK3, paddingTop: "3px" }}>
                                      {fund.takenOut > 0 ? `−${plain(fund.takenOut)}` : "$0"}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <FundChart months={fund.months} />
                      <div style={{ ...priv, ...NUM, marginTop: "12px" }}>{fund.note}</div>
                      <table {...T} width="100%" style={{ width: "100%", borderCollapse: "separate", marginTop: "12px", border: "1px dashed #D9D5C6", borderRadius: "9px" }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: "11px 13px" }}>
                              <div style={lbl}>Dec 31</div>
                              <div style={{ fontSize: "12.5px", fontWeight: 600, marginTop: "2px" }}>Whatever&apos;s left goes to savings</div>
                            </td>
                            <td style={{ color: INK3, fontSize: "15px", textAlign: "center" }}>{"→"}</td>
                            <td style={{ padding: "11px 13px" }}>
                              <div style={lbl}>Jan 1</div>
                              <div style={{ ...NUM, fontSize: "12.5px", fontWeight: 600, marginTop: "2px" }}>Fund starts again at {plain(fund.seed)}</div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </Card>

                    {/* 5 · Shared pot */}
                    <Card>
                      <CardHead title="Shared pot" aside="groceries · dining together · home · big stuff" />
                      <div style={{ ...sub, ...NUM }}>
                        {sh.left < 0 ? (
                          <>
                            The shared pot is <b style={{ color: RED }}>{plain(sh.left)} over</b> for the month.
                          </>
                        ) : sh.runDry ? (
                          <>
                            {sh.oneOffs > 0 ? "Leaving out one-offs, the" : "The"} shared pot runs dry around <b style={{ color: INK }}>{sh.runDry}</b>. To last the month:{" "}
                            <b style={{ color: INK }}>{plain(sh.perDayToLast)} a day</b> between you.
                          </>
                        ) : (
                          <>
                            At this rate the shared pot lasts the month — <b style={{ color: INK }}>{plain(sh.perDayToLast)} a day</b> between you.
                          </>
                        )}
                      </div>
                      <Bar frac={sh.budget > 0 ? sh.spent / sh.budget : 0} paceFrac={elapsedFrac} colour={AMBER} />
                      <BarLegend
                        left={`${plain(sh.spent)} of ${plain(sh.budget)} spent · pace ${plain(sh.paceTarget)}`}
                        right={`${plain(sh.diff)} ${sh.diff > 0 ? "over" : "under"} pace`}
                        rightColour={sh.diff > 0 ? RED : GREEN}
                      />
                      {sh.whoSpent.length > 0 ? (
                        <div style={{ marginTop: "14px" }}>
                          <div style={lbl}>Who spent it</div>
                          <table {...T} width="100%" style={{ width: "100%", borderCollapse: "separate", borderRadius: "99px", overflow: "hidden", margin: "4px 0 7px" }}>
                            <tbody>
                              <tr>
                                {sh.whoSpent.map((w, i) => {
                                  const total = sh.whoSpent.reduce((s, x) => s + x.amount, 0) || 1;
                                  const c = w.name === "Joint card" ? "#C9C4B4" : w.name === "You" ? myColour : colourFor(w.name, pots.jars);
                                  return (
                                    <td key={i} width={`${Math.max(1, Math.round((w.amount / total) * 100))}%`} style={{ height: "10px", lineHeight: 0, fontSize: 0, background: c }}>
                                      &nbsp;
                                    </td>
                                  );
                                })}
                              </tr>
                            </tbody>
                          </table>
                          <div style={small}>{sh.whoSpent.map((w) => `${w.name} ${plain(w.amount)}`).join(" · ")}</div>
                        </div>
                      ) : null}
                      {sh.oneOffNote ? <div style={{ ...priv, ...NUM, marginTop: "12px" }}>{sh.oneOffNote}</div> : null}
                    </Card>

                    {/* 6 · New charges, by pot */}
                    <Card>
                      <CardHead title="New since your last report" aside={newCount ? `${newCount} · ${plain(newTotal)}` : undefined} />
                      {pots.charges.length === 0 ? (
                        <div style={{ fontSize: "13px", color: INK3 }}>Nothing new since your last report. Sync ran at {p.syncedAt}.</div>
                      ) : (
                        pots.charges.map((g) => (
                          <table key={g.group} {...T} width="100%" style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px" }}>
                            <tbody>
                              <tr>
                                <td style={{ ...lbl, padding: "8px 0 4px" }}>{g.group}</td>
                                <td align="right" style={{ ...lbl, ...NUM, padding: "8px 0 4px" }}>{plain(g.total)}</td>
                              </tr>
                              {g.rows.map((r, i) => (
                                <tr key={i}>
                                  <td style={{ padding: "9px 0", borderBottom: i === g.rows.length - 1 ? "none" : `1px solid ${HAIR}` }}>
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        padding: "3px 8px",
                                        borderRadius: "99px",
                                        whiteSpace: "nowrap",
                                        marginRight: "9px",
                                        background: g.group === "Shared" ? AMBER_SOFT : g.group === "Which pot?" ? SUNK : GREEN_SOFT,
                                        color: g.group === "Shared" ? AMBER_D : g.group === "Which pot?" ? INK2 : GREEN,
                                      }}
                                    >
                                      {r.tag}
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: "13.5px" }}>{r.merchant}</span>
                                    <div style={{ fontSize: "11px", color: INK3, marginTop: "1px" }}>
                                      {r.note}
                                      {r.pending ? <span style={{ color: AMBER_D, fontWeight: 600 }}> · pending</span> : null}
                                    </div>
                                    {r.askUrl ? (
                                      <a
                                        href={r.askUrl}
                                        style={{ display: "inline-block", marginTop: "6px", fontSize: "11.5px", fontWeight: 700, padding: "6px 12px", borderRadius: "99px", border: "1px solid #E3DFD2", background: SURFACE, color: INK, textDecoration: "none" }}
                                      >
                                        Choose a pot {"→"}
                                      </a>
                                    ) : null}
                                  </td>
                                  <td
                                    align="right"
                                    style={{
                                      ...NUM,
                                      verticalAlign: "top",
                                      padding: "9px 0",
                                      fontFamily: DISPLAY,
                                      fontWeight: 700,
                                      fontSize: "15px",
                                      color: r.pending ? INK3 : INK,
                                      borderBottom: i === g.rows.length - 1 ? "none" : `1px solid ${HAIR}`,
                                    }}
                                  >
                                    {plain(r.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ))
                      )}
                      {pots.privacyNote ? <div style={{ ...priv, marginTop: "12px" }}>{pots.privacyNote}</div> : null}
                    </Card>

                    {/* Footer */}
                    <tr>
                      <td style={{ padding: "14px 4px 0", fontSize: "11.5px", color: INK3, lineHeight: 1.6 }}>
                        <b style={{ color: INK2 }}>How the pots work:</b> the card sets the default — the joint card goes to Shared, your own card to
                        yours. Groceries, medical, home and the dog go to Shared whichever card paid. Change any charge&apos;s pot in the app.
                        <br />
                        <b style={{ color: INK2 }}>How the fun fund works:</b> at each month&apos;s end, whatever&apos;s left across all three pots is
                        added; anything over is taken out. It resets to {plain(fund.seed)} every January 1, and whatever was left on December 31 moves
                        to savings.
                        <br />
                        {plain(p.committed.total)} committed this month (mortgage, insurance, car) — handled, not counted. Synced {p.syncedAt}.
                        <br />
                        <a href={p.appUrl} style={{ color: GREEN, textDecoration: "none", fontWeight: 600 }}>
                          Open {p.appName}
                        </a>
                        {p.unsubscribeUrl ? (
                          <>
                            {" · "}
                            <a href={p.unsubscribeUrl} style={{ color: INK3, textDecoration: "underline" }}>
                              Stop these emails
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

// ─── Plain text ────────────────────────────────────────────────────────────

const stateWord: Record<CellState, string> = { hit: "", miss: "", now: "(this month)", pre: "before the plan", future: "", none: "no data" };

function stripText(strip: PotsStrip): string {
  return strip.cells
    // Months before the plan are context in the strip, noise in a sentence.
    .filter((c) => c.state !== "future" && c.state !== "pre")
    .map((c) => `${c.label} ${c.value != null ? short(c.value) : c.delta != null ? compact(c.delta) : stateWord[c.state]}`.trim())
    .join(" · ");
}

export function financialHealthDailyPotsText(p: FinancialHealthDailyProps & { pots: PotsBlock }): string {
  const pots = p.pots;
  const daysLeft = Math.max(1, p.daysInMonth - p.dayOfMonth + 1);
  const mine = pots.jars.find((j) => j.mine) ?? pots.jars[0];
  const L: string[] = [`${p.appName.toUpperCase()} — ${p.reportDate}, day ${p.dayOfMonth} of ${p.daysInMonth}`, ""];

  L.push(`${pots.reader ? `${pots.reader.toUpperCase()} · YOURS TO SPEND` : "YOUR POT"} · ${daysLeft} days left`);
  L.push(`${money(mine.left)} left${mine.left >= 0 ? ` — ${plain(Math.max(0, mine.left) / daysLeft)} a day, on anything you like` : ""}.`);
  L.push(`${plain(mine.spent)} of ${plain(mine.budget)} spent · pace ${plain(mine.paceTarget)} · ${plain(mine.diff)} ${mine.diff > 0 ? "over" : "under"} pace.`, "");

  L.push(`THE HOUSEHOLD — ${plain(pots.monthBudget)} a month, split in thirds`);
  {
    const h = householdTotals(pots);
    L.push(`Together: ${plain(h.spent)} spent of ${plain(pots.monthBudget)} · ${h.left < 0 ? `${plain(-h.left)} over` : `${plain(h.left)} left`} · ${plain(Math.abs(h.diff))} ${h.diff > 0 ? "over" : "under"} pace.`);
  }
  for (const j of pots.jars) {
    L.push(j.left < 0 ? `${j.label}: ${plain(j.left)} over its ${plain(j.budget)}` : `${j.label}: ${money(j.left)} left of ${plain(j.budget)} · ${verdictText(j).text}`);
  }
  L.push("");

  const pc = pots.planCheck;
  L.push(`PLAN CHECK — ${pc.year}, month ${pc.month} of 12`);
  if (pc.savings) {
    {
      const sv = pc.savings;
      const of = sv.earnedToDate ? ` of ${plain(sv.earnedToDate)} that came in (${Math.round((sv.savedToDate / sv.earnedToDate) * 100)}%)` : "";
      const gap = sv.savedToDate >= sv.targetToDate ? `${plain(sv.savedToDate - sv.targetToDate)} ahead` : `${plain(sv.targetToDate - sv.savedToDate)} short`;
      L.push(`Savings: ${sv.verdict}. ${plain(sv.savedToDate)} saved${of}${sv.span ? `, ${sv.span}` : ""}.`);
      L.push(`The plan needs ${plain(sv.target)} a month — ${plain(sv.targetToDate)} for these months, so ${gap}.`);
    }
    L.push(`  ${stripText(pc.savings)}`);
    if (pc.savings.gaps?.length) L.push(`  Not in yet: ${pc.savings.gaps.join(" ")}`);
  }
  L.push(`Spending: ${pc.spending.verdict}, since ${pc.spending.sinceLabel}. Averaging ${signed(pc.spending.averageUnder)} a month.`);
  L.push(`  ${stripText(pc.spending)}`, "");

  const f = pots.fund;
  L.push(`FUN FUND · ${f.year} — ${money(f.balance)}${f.balance < 0 ? " short" : ""}`);
  L.push(`Started ${f.startLabel} with ${plain(f.seed)} · months under ${f.added > 0 ? `+${plain(f.added)}` : "$0"} · months over ${f.takenOut > 0 ? `−${plain(f.takenOut)}` : "$0"}`);
  L.push(`  ${f.months.map((m) => `${m.label} ${m.delta == null ? "–" : `${m.projected ? "≈" : ""}${compact(m.delta)}`}`).join(" · ")}`);
  L.push(f.note, `Dec 31: whatever's left goes to savings. Jan 1: starts again at ${plain(f.seed)}.`, "");

  const sh = pots.shared;
  L.push("SHARED POT");
  if (sh.left < 0) L.push(`${plain(sh.left)} over for the month.`);
  else if (sh.runDry) L.push(`Runs dry around ${sh.runDry}. To last the month: ${plain(sh.perDayToLast)} a day between you.`);
  else L.push(`Lasts the month at this rate — ${plain(sh.perDayToLast)} a day between you.`);
  L.push(`${plain(sh.spent)} of ${plain(sh.budget)} spent · pace ${plain(sh.paceTarget)}.`);
  if (sh.whoSpent.length) L.push(`Who spent it: ${sh.whoSpent.map((w) => `${w.name} ${plain(w.amount)}`).join(", ")}.`);
  if (sh.oneOffNote) L.push(sh.oneOffNote);
  L.push("");

  L.push("NEW SINCE YOUR LAST REPORT");
  if (pots.charges.length === 0) L.push(`Nothing new. Sync ran at ${p.syncedAt}.`);
  for (const g of pots.charges) {
    L.push(`${g.group} — ${plain(g.total)}`);
    for (const r of g.rows) {
      L.push(`  ${r.merchant} ${plain(r.amount)} · ${r.note}${r.pending ? " · pending" : ""}`);
      if (r.askUrl) L.push(`    Choose a pot: ${r.askUrl}`);
    }
  }
  if (pots.privacyNote) L.push("", pots.privacyNote);

  L.push(
    "",
    `${plain(p.committed.total)} committed this month — handled, not counted.`,
    `Open ${p.appName}: ${p.appUrl}`,
    `Based on the sync at ${p.syncedAt}.`
  );
  if (p.unsubscribeUrl) L.push(`Stop these emails: ${p.unsubscribeUrl}`);
  return L.join("\n");
}

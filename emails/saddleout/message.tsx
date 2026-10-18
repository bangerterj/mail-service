/**
 * SaddleOut "A message from SaddleOut": a one-to-one reply from /admin/feedback to a rider.
 * Transactional: it answers something the rider sent. The body is plain text typed by an
 * admin (it already opens with "Hi <name>,"); React escapes it, blank lines split paragraphs
 * and single line breaks are kept.
 */

import * as React from "react";

export interface SaddleoutMessageProps {
  name: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export const SADDLEOUT_MESSAGE_SUBJECT = "A message from SaddleOut";

const F = "Arial,Helvetica,sans-serif";
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace";

function paragraphs(body: string): string[][] {
  return body
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.split("\n"));
}

const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({ padding: "0 28px", ...extra });

export function SaddleoutMessageEmail({ body, ctaUrl, ctaLabel }: SaddleoutMessageProps) {
  const paras = paragraphs(body);
  const preview = body.replace(/\s+/g, " ").trim().slice(0, 120);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light only" />
        <title>{SADDLEOUT_MESSAGE_SUBJECT}</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#EDECE4" }}>
        <span style={{ display: "none", visibility: "hidden", opacity: 0, color: "transparent", height: 0, width: 0, overflow: "hidden" }}>{preview}</span>
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ backgroundColor: "#EDECE4" }}>
          <tbody><tr><td align="center" style={{ padding: "32px 12px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="560" style={{ width: 560, maxWidth: "100%", backgroundColor: "#FBFAF5", border: "1px solid #E3E1D5", borderRadius: 6, overflow: "hidden" }}>
              <tbody>
                <tr><td style={{ backgroundColor: "#070B09", padding: "18px 28px", fontFamily: F, fontSize: 20, fontWeight: "bold", letterSpacing: 2, color: "#F1F0E4", lineHeight: "24px", whiteSpace: "nowrap" }}>
                  SADDLE<img src="https://mailer.bangerterbuilds.com/brand/saddleout-o.png" width={20} height={20} alt="O" style={{ display: "inline-block", width: 20, height: 20, border: 0, verticalAlign: -3, margin: "0 1px" }} />UT
                </td></tr>
                <tr><td style={cell({ paddingTop: 32, fontFamily: MONO, fontSize: 11, letterSpacing: 2, color: "#8A5A0B", lineHeight: "16px" })}>A MESSAGE FROM SADDLEOUT</td></tr>
                {paras.map((lines, i) => (
                  <tr key={i}><td style={cell({ paddingTop: i === 0 ? 14 : 12, fontFamily: F, fontSize: 15, color: "#3A4238", lineHeight: "23px" })}>
                    {lines.map((l, j) => (
                      <React.Fragment key={j}>{j > 0 && <br />}{l}</React.Fragment>
                    ))}
                  </td></tr>
                ))}
                {ctaUrl && (
                  <tr><td style={cell({ paddingTop: 22 })}>
                    <table role="presentation" cellPadding={0} cellSpacing={0} border={0}><tbody><tr>
                      <td style={{ backgroundColor: "#F2A72C", borderRadius: 4 }}>
                        <a href={ctaUrl} style={{ display: "block", padding: "14px 26px", fontFamily: F, fontSize: 16, fontWeight: "bold", color: "#0E1410", textDecoration: "none", lineHeight: "20px" }}>{ctaLabel || "Open SaddleOut"}</a>
                      </td>
                    </tr></tbody></table>
                  </td></tr>
                )}
                <tr><td style={cell({ paddingTop: 28 })}><div style={{ height: 1, backgroundColor: "#E3E1D5", fontSize: 0, lineHeight: 0 }}>&nbsp;</div></td></tr>
                <tr><td style={cell({ paddingTop: 16, paddingBottom: 28, fontFamily: F, fontSize: 12, color: "#7A8476", lineHeight: "18px" })}>
                  Just reply to this email.
                </td></tr>
              </tbody>
            </table>
          </td></tr></tbody>
        </table>
      </body>
    </html>
  );
}

export function saddleoutMessageText({ body, ctaUrl, ctaLabel }: SaddleoutMessageProps): string {
  const out = [body.replace(/\r\n?/g, "\n").trim()];
  if (ctaUrl) out.push("", `${ctaLabel || "Open SaddleOut"}: ${ctaUrl}`);
  out.push("", "Just reply to this email.");
  return out.join("\n");
}

import * as React from "react";

/**
 * banter.camp's Evening Recap — the 8pm digest of unread notifications.
 *
 * Unlike `banter-signin`, this is NOT a verbatim port. The original lived inline
 * in the cron route and had three defects this version fixes by construction:
 *
 *  1. It sent HTML with no plaintext part, which is a spam signal.
 *  2. It carried no opt-out, though a scheduled digest of other people's
 *     activity is exactly the mail a recipient is entitled to stop. It is a
 *     `notification`, so the service now requires an unsubscribeUrl.
 *  3. It interpolated an actor's display name straight into markup. A name is
 *     user-controlled, so React escapes it here.
 *
 * The brand chrome matches `banter-signin` so the two read as one sender.
 */
export interface BanterRecapProps {
  appName: string;
  /** One line per missed notification, already phrased by the app. */
  items: string[];
  viewUrl: string;
  unsubscribeUrl?: string;
}

export function BanterRecapEmail({ items, viewUrl, unsubscribeUrl }: BanterRecapProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Evening Recap</title>
      </head>
      <body style={body}>
        <table
          width="100%"
          border={0}
          cellSpacing={0}
          cellPadding={0}
          style={{ maxWidth: "500px", margin: "0 auto", textAlign: "left" }}
        >
          <tbody>
            <tr>
              <td style={{ paddingBottom: "24px" }}>
                <h1 style={wordmark}>banter.camp</h1>
              </td>
            </tr>
            <tr>
              <td style={card}>
                <h2 style={heading}>The Evening Recap</h2>
                <p style={paragraph}>Here is what you missed today on banter.camp:</p>
                <ul style={list}>
                  {items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <table
                  width="100%"
                  border={0}
                  cellSpacing={0}
                  cellPadding={0}
                  style={{ margin: "32px 0" }}
                >
                  <tbody>
                    <tr>
                      <td align="left">
                        <a href={viewUrl} style={button}>
                          View Notifications
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {/* The URL as visible text — some clients strip styled buttons. */}
                <p style={fine}>{viewUrl}</p>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: "32px", textAlign: "center" }}>
                <p style={footer}>
                  Free during open beta. A small, transparent fee may come later &mdash;
                  just enough to stay ad-free <em>forever</em>.
                  <br />
                  <br />
                  sent from the banter.camp automated systems
                  {unsubscribeUrl ? (
                    <>
                      <br />
                      <br />
                      <a href={unsubscribeUrl} style={footerLink}>
                        Turn off the evening recap
                      </a>
                    </>
                  ) : null}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function banterRecapText({ items, viewUrl, unsubscribeUrl }: BanterRecapProps) {
  return [
    "The Evening Recap",
    "",
    "Here is what you missed today on banter.camp:",
    "",
    ...items.map((item) => `- ${item}`),
    "",
    "View your notifications:",
    viewUrl,
    "",
    "---",
    "sent from the banter.camp automated systems",
    ...(unsubscribeUrl ? ["", `Turn off the evening recap: ${unsubscribeUrl}`] : []),
  ].join("\n");
}

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const body: React.CSSProperties = {
  backgroundColor: "#f3ecd9",
  color: "#2c2e30",
  fontFamily: SANS,
  padding: "40px 20px",
  textAlign: "center",
  margin: 0,
  lineHeight: 1.6,
};

const wordmark: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: "24px",
  fontWeight: "normal",
  margin: 0,
  color: "#2c2e30",
  letterSpacing: "-0.5px",
};

const card: React.CSSProperties = {
  backgroundColor: "#fdfbf7",
  border: "1px solid rgba(44, 46, 48, 0.1)",
  borderRadius: "12px",
  padding: "32px 28px",
};

const heading: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: "20px",
  fontWeight: "normal",
  marginTop: 0,
  marginBottom: "24px",
  color: "#1a1a1a",
};

const paragraph: React.CSSProperties = {
  fontSize: "14.5px",
  color: "#4a4a4a",
  marginBottom: "20px",
  lineHeight: 1.6,
};

const list: React.CSSProperties = {
  fontSize: "14.5px",
  color: "#4a4a4a",
  lineHeight: 1.8,
  marginBottom: "32px",
};

const button: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#b34d22",
  color: "#ffffff",
  textDecoration: "none",
  fontFamily: SANS,
  fontSize: "14px",
  fontWeight: 500,
  padding: "14px 28px",
  borderRadius: "24px",
  letterSpacing: "0.3px",
};

const fine: React.CSSProperties = {
  fontSize: "12px",
  color: "#8a8a8a",
  wordBreak: "break-all",
  margin: 0,
};

const footer: React.CSSProperties = {
  fontSize: "11.5px",
  color: "#888",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  margin: 0,
};

const footerLink: React.CSSProperties = { color: "#888", textDecoration: "underline" };

BanterRecapEmail.PreviewProps = {
  appName: "Banter",
  items: ["Jeff replied to your post", "Sam reacted to your comment"],
  viewUrl: "https://banter.camp/notifications",
  unsubscribeUrl: "https://banter.camp/settings/notifications?token=preview",
} satisfies BanterRecapProps;

export default BanterRecapEmail;

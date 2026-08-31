/**
 * "Log in to banter.camp" — the sign-in link.
 *
 * This is uniblog's `src/lib/email.ts` + `src/lib/email/templates.ts` markup,
 * unchanged except where a `{token}` stands in for a fact. Keeping the markup
 * byte-for-byte is the point: it is what banter.camp sends today, so a
 * recipient sees no change in the cutover.
 *
 * The footer's pricing line is brand copy, not boilerplate — it says what
 * banter.camp charges and why. It belongs to this template and must not migrate
 * into a shared layout, where it would leak into other apps' mail.
 */

import type { TokenSchema } from "@/lib/token-render";

export const BANTER_SIGNIN_TOKENS = {
  /** The address the link was requested for, shown back to the reader. */
  identifier: "text",
  signInUrl: "url",
} as const satisfies TokenSchema;

/** Lowercase, deliberately — it is how banter.camp writes. */
export const BANTER_SIGNIN_SUBJECT = "log in to banter.camp";

export const BANTER_SIGNIN_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Log in to banter.camp</title>
</head>
<body style="background-color: #f3ecd9; color: #2c2e30; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center; margin: 0; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; text-align: left;">
    <tr>
      <td style="padding-bottom: 24px;">
        <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: normal; margin: 0; color: #2c2e30; letter-spacing: -0.5px;">
          banter.camp
        </h1>
      </td>
    </tr>
    <tr>
      <td style="background-color: #fdfbf7; border: 1px solid rgba(44, 46, 48, 0.1); border-radius: 12px; padding: 32px 28px;">
    <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: normal; margin-top: 0; margin-bottom: 24px; color: #1a1a1a;">
      Log in to banter.camp
    </h2>
    <p style="font-size: 14.5px; color: #4a4a4a; margin-bottom: 20px; line-height: 1.6;">
      Someone requested a secure sign-in link for {identifier}.
    </p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
      <tr>
        <td align="left">
          <a href="{signInUrl}" style="display: inline-block; background-color: #b34d22; color: #ffffff; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 500; padding: 14px 28px; border-radius: 24px; letter-spacing: 0.3px;">
            Confirm Identity
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #888; margin-top: 24px;">
      If you did not request this email, you can safely ignore it.
    </p>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 32px; text-align: center;">
        <p style="font-size: 11.5px; color: #888; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0;">
          Free during open beta. A small, transparent fee may come later &mdash; just enough to stay ad-free <em>forever</em>.
          <br/><br/>
          sent from the banter.camp automated systems
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const BANTER_SIGNIN_TEXT = `Log in to banter.camp

Someone requested a secure sign-in link for {identifier}.

Confirm your identity by opening this link:
{signInUrl}

If you did not request this email you can safely ignore it.`;

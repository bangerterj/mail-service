/**
 * SaddleOut "new sign-up" alert, sent to the site's own admins (not riders)
 * when someone joins the beta interest list or finishes setup and joins the queue.
 *
 * A notification: a rider's action caused it, so it carries the admin's own
 * opt-out (preferencesUrl = the request's unsubscribeUrl). Same shell as the
 * sign-in email (saddleout/magic-sign-in.ts) so it reads as SaddleOut mail.
 *
 * `details` is several short lines ("Devices: iPhone 15"); the cell uses
 * white-space:pre-line so each fact keeps its own line without markup in data.
 */

import type { TokenSchema } from "@/lib/token-render";

export const SADDLEOUT_NEW_SIGNUP_TOKENS = {
  /** "NEW INTEREST" or "JOINED THE QUEUE". */
  eyebrow: "text",
  /** "trailrat joined the queue at #12". */
  headline: "text",
  /** One fact per line. */
  details: "text",
  /** "3 in the first wave · 12 in the queue · 40 interested". */
  totals: "text",
  /** The admin page, filtered to this rider. */
  adminUrl: "url",
  /** The admin's own "stop these emails" link. */
  preferencesUrl: "url",
} as const satisfies TokenSchema;

export const SADDLEOUT_NEW_SIGNUP_SUBJECT = "SaddleOut beta: {headline}";

const F = "font-family:Arial,Helvetica,sans-serif;";
const MONO = "font-family:'JetBrains Mono',Menlo,Consolas,monospace;";
const HEAD = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;";

export const SADDLEOUT_NEW_SIGNUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>SaddleOut beta sign-up</title>
<style>
@media only screen and (max-width: 600px) {
.wrap { width: 100% !important; }
.pad { padding-left: 22px !important; padding-right: 22px !important; }
.h1 { font-size: 26px !important; line-height: 30px !important; }
}
</style>
</head>
<body style="margin:0; padding:0; background-color:#EDECE4;">
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">{totals}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EDECE4;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" class="wrap" style="width:560px; max-width:560px; background-color:#FBFAF5; border:1px solid #E3E1D5; border-radius:6px; overflow:hidden;">
<tr><td bgcolor="#070B09" class="pad" style="background-color:#070B09; padding:18px 28px; ${F} font-size:20px; font-weight:bold; letter-spacing:2px; color:#F1F0E4; line-height:24px; white-space:nowrap;">SADDLE<img src="https://mailer.bangerterbuilds.com/brand/saddleout-o.png" width="20" height="20" alt="O" style="display:inline-block; width:20px; height:20px; border:0; vertical-align:-3px; margin:0 1px; color:#F2A72C;">UT <span style="${MONO} font-size:9px; letter-spacing:1px; color:#93A388; font-weight:normal;">&nbsp;ADMIN</span></td></tr>
<tr><td class="pad" style="padding:30px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">{eyebrow}</td></tr>
<tr><td class="pad h1" style="padding:8px 28px 0 28px; ${HEAD} font-size:30px; font-weight:bold; color:#0E1410; line-height:34px;">{headline}</td></tr>
<tr><td class="pad" style="padding:18px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td bgcolor="#F4F3EC" style="background-color:#F4F3EC; border-radius:4px; padding:14px 16px; ${F} font-size:15px; color:#0E1410; line-height:23px; white-space:pre-line;">{details}</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:16px 28px 0 28px; ${F} font-size:14px; color:#3A4238; line-height:21px;">{totals}</td></tr>
<tr><td class="pad" style="padding:22px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#F2A72C" style="background-color:#F2A72C; border-radius:4px;">
<a href="{adminUrl}" style="display:block; padding:13px 24px; ${F} font-size:15px; font-weight:bold; color:#0E1410; text-decoration:none; line-height:20px;">Open in admin</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:30px 28px 0 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="#E3E1D5" style="background-color:#E3E1D5; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:16px 28px 28px 28px; ${F} font-size:12px; color:#7A8476; line-height:18px;">You get these because you're a SaddleOut admin with email alerts on (sign-ups and tester feedback). <a href="{preferencesUrl}" style="color:#7A8476; text-decoration:underline;">Stop these emails</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const SADDLEOUT_NEW_SIGNUP_TEXT = `{eyebrow}
{headline}

{details}

{totals}

Open in admin: {adminUrl}

You get these because you're a SaddleOut admin with email alerts on (sign-ups and tester feedback).
Stop these emails: {preferencesUrl}`;

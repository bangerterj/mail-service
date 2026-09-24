/**
 * SaddleOut "Your sign-in link" — E1 from the Claude Design handoff
 * (project 02a8f611…, `Email Templates.dc.html`).
 *
 * Deviations from the design, on purpose:
 *  - The chainring-O wordmark is live text (amber "O") rather than the 2x PNG
 *    the design calls for. No hosted PNG exists yet; text survives image
 *    blocking and dark mode. Swap in an <img alt="SaddleOut"> when one does.
 *  - The "Requested from <browser> near <location>" line is left out: the
 *    saddleout app does not send that data, and a guessed value is worse than
 *    none in a security line.
 */

import type { TokenSchema } from "@/lib/token-render";

export const SADDLEOUT_SIGN_IN_TOKENS = {
  /** The complete, single-use sign-in URL. */
  signInUrl: "url",
  /** e.g. "15 minutes". Defaulted in the schema. */
  expiresIn: "text",
} as const satisfies TokenSchema;

export const SADDLEOUT_SIGN_IN_SUBJECT = "Your SaddleOut sign-in link";

const F = "font-family:Arial,Helvetica,sans-serif;";
const MONO = "font-family:'JetBrains Mono',Menlo,Consolas,monospace;";
const HEAD = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;";

export const SADDLEOUT_SIGN_IN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Your SaddleOut sign-in link</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
@media only screen and (max-width: 600px) {
.wrap { width: 100% !important; }
.pad { padding-left: 22px !important; padding-right: 22px !important; }
.h1 { font-size: 28px !important; line-height: 32px !important; }
}
</style>
</head>
<body style="margin:0; padding:0; background-color:#EDECE4;">
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">Works once, for the next {expiresIn}.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EDECE4;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" class="wrap" style="width:560px; max-width:560px; background-color:#FBFAF5; border:1px solid #E3E1D5; border-radius:6px; overflow:hidden;">
<tr><td bgcolor="#070B09" class="pad" style="background-color:#070B09; padding:18px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="${F} font-size:20px; font-weight:bold; letter-spacing:2px; color:#F1F0E4; line-height:24px;">SADDLE<span style="color:#F2A72C;">O</span>UT</td>
<td align="right" style="${MONO} font-size:10px; letter-spacing:2px; color:#93A388; line-height:24px;">STAY IN. HEAD OUT.</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:32px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">SIGN IN</td></tr>
<tr><td class="pad h1" style="padding:8px 28px 0 28px; ${HEAD} font-size:34px; font-weight:bold; color:#0E1410; line-height:38px;">Your sign-in link</td></tr>
<tr><td class="pad" style="padding:14px 28px 0 28px; ${F} font-size:16px; color:#3A4238; line-height:24px;">Tap the button to sign in to SaddleOut. No password needed. The link works once, for the next {expiresIn}.</td></tr>
<tr><td class="pad" style="padding:22px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#F2A72C" style="background-color:#F2A72C; border-radius:4px;">
<a href="{signInUrl}" style="display:block; padding:14px 26px; ${F} font-size:16px; font-weight:bold; color:#0E1410; text-decoration:none; line-height:20px;">Sign in to SaddleOut</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:24px 28px 0 28px; ${F} font-size:13px; color:#5A6456; line-height:19px;">Button not working? Paste this link into your browser:</td></tr>
<tr><td class="pad" style="padding:8px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td bgcolor="#F4F3EC" style="background-color:#F4F3EC; border-radius:4px; padding:12px 14px; ${MONO} font-size:12px; color:#0E1410; line-height:18px; word-break:break-all;"><a href="{signInUrl}" style="color:#0E1410; text-decoration:none;">{signInUrl}</a></td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:24px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td bgcolor="#F8F7F1" style="background-color:#F8F7F1; border-left:3px solid #E3E1D5; padding:12px 16px; ${F} font-size:13px; color:#3A4238; line-height:19px;"><strong style="color:#0E1410;">Didn't ask for this?</strong> Ignore this email. The link does nothing unless it's opened, and SaddleOut will never ask for a password.</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:32px 28px 0 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="#E3E1D5" style="background-color:#E3E1D5; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:18px 28px 0 28px; ${F} font-size:12px; color:#7A8476; line-height:18px;">You're getting this because someone asked to sign in to SaddleOut with this address.</td></tr>
<tr><td class="pad" style="padding:8px 28px 28px 28px; ${F} font-size:12px; color:#7A8476; line-height:18px;"><a href="https://saddleout.com/account" style="color:#7A8476; text-decoration:underline;">Account</a> &middot; <a href="https://saddleout.com/privacy" style="color:#7A8476; text-decoration:underline;">Privacy</a> &middot; SaddleOut, Mission Viejo, CA</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const SADDLEOUT_SIGN_IN_TEXT = `Your SaddleOut sign-in link

Follow the link below to sign in to SaddleOut. No password needed. It works
once, for the next {expiresIn}.

{signInUrl}

Didn't ask for this? Ignore this email. The link does nothing unless it's
opened, and SaddleOut will never ask for a password.

You're getting this because someone asked to sign in to SaddleOut with this
address.
Account: https://saddleout.com/account
Privacy: https://saddleout.com/privacy
SaddleOut, Mission Viejo, CA`;

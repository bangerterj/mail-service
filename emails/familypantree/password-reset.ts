/**
 * "Set a new password" — the forgotten-password path.
 *
 * A separate template from `./magic-sign-in` for one reason, and it is not
 * cosmetic: this link must NOT create a session. It opens a form, the person
 * chooses a password, and then they sign in with it. Sending the magic-link
 * template here would sign in whoever holds the mailbox — which is exactly the
 * situation a password reset is requested from — and the body below promises
 * the opposite in so many words: "It takes you to a form, not into your
 * account."
 *
 * `PASSWORD_RESET_TTL_MS` in `src/components/auth/reset-store.ts` is what makes
 * the printed 30 minutes true, and the reset consumer never calls `signIn`.
 * `src/components/auth/reset-no-session.test.ts` is the proof.
 */

import type { TokenSchema } from "@/lib/token-render";

export const PASSWORD_RESET_TOKENS = {
  /** The complete, single-use link to the set-a-password form. */
  resetUrl: "url",
  /** The sign-in screen, for "sign in with a one-time email link instead". */
  loginUrl: "url",
  reportUrl: "url",
  siteDomain: "text",
  postalAddress: "text",
  preferencesUrl: "url",
} as const satisfies TokenSchema;

export const PASSWORD_RESET_SUBJECT = "Reset your FamilyPantree password";

export const PASSWORD_RESET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Reset your FamilyPantree password</title>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
@media only screen and (max-width: 620px) {
.wrap { width: 100% !important; }
.pad { padding-left: 24px !important; padding-right: 24px !important; }
.h1 { font-size: 24px !important; line-height: 30px !important; }
}
</style>
</head>
<body style="margin:0; padding:0; background-color:#efe8dc;">
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">Set a new password. This link expires in 30 minutes and will not sign you in.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efe8dc;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="wrap" style="width:600px; max-width:600px; background-color:#fdfbf7; border-radius:14px; overflow:hidden;">
<tr><td height="4" bgcolor="#c0562f" style="background-color:#c0562f; font-size:0; line-height:0;">&nbsp;</td></tr>
<tr><td class="pad" style="padding:28px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:bold; letter-spacing:-0.4px; color:#26211d; mso-line-height-rule:exactly; line-height:24px;">FamilyPan<span style="color:#6b7250;">tree</span></td>
</tr></table>
</td></tr>
<tr><td class="pad h1" style="padding:20px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:28px; font-weight:bold; letter-spacing:-0.5px; color:#26211d; mso-line-height-rule:exactly; line-height:34px;">Set a new password</td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:16px; color:#4a423b; mso-line-height-rule:exactly; line-height:24px;">Use the button below to choose a new password for the FamilyPantree account on this address.</td></tr>
<tr><td class="pad" style="padding:8px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#c0562f" style="background-color:#c0562f; border-radius:8px;">
<a href="{resetUrl}" style="display:block; padding:15px 28px; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; mso-line-height-rule:exactly; line-height:20px;">Choose a new password</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:24px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#f7f2ea; border-radius:14px;">
<tr><td style="padding:20px 20px 4px 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#8a5a44; mso-line-height-rule:exactly; line-height:20px;">What this link does</td></tr>
<tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">It takes you to a form, not into your account.</strong> You will set the new password yourself, then sign in with it.</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">It expires in 30 minutes</strong> and works once.</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;">Your current password keeps working until you finish setting a new one.</td></tr>
<tr><td style="padding:0 20px 20px 20px; font-size:0; line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
<tr><td class="pad" style="padding:24px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">Prefer not to set a password? You can sign in with a one-time email link instead from the <a href="{loginUrl}" style="color:#26211d;">sign-in screen</a>.</td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">Did not ask for this? Ignore this email and nothing changes. If you think someone else is trying to get in, <a href="{reportUrl}" style="color:#26211d;">tell us</a>.</td></tr>
<tr><td class="pad" style="padding:32px 40px 0 40px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td height="1" bgcolor="#e2dacf" style="background-color:#e2dacf; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:20px 40px 4px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">You received this because a password reset was requested for this address on {siteDomain}.</td></tr>
<tr><td class="pad" style="padding:4px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">{postalAddress}</td></tr>
<tr><td class="pad" style="padding:0 40px 32px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;"><a href="{preferencesUrl}" style="color:#7a7167; text-decoration:underline;">Manage email preferences</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const PASSWORD_RESET_TEXT = `Set a new FamilyPantree password

Use the link below to choose a new password for the FamilyPantree account on
this address.

{resetUrl}

WHAT THIS LINK DOES
- It takes you to a form, not into your account. You will set the new password
  yourself, then sign in with it.
- It expires in 30 minutes and works once.
- Your current password keeps working until you finish setting a new one.

Prefer not to set a password? You can sign in with a one-time email link
instead from the sign-in screen: {loginUrl}

Did not ask for this? Ignore this email and nothing changes. If you think
someone else is trying to get in, tell us: {reportUrl}

You received this because a password reset was requested for this address on
{siteDomain}.
{postalAddress}
Manage email preferences: {preferencesUrl}`;

/**
 * "Your sign-in link" — the magic link, and the Resend action behind it.
 *
 * The one email in this set that DOES create a session when followed. Its
 * counterpart, `./password-reset`, must never be substituted for it: reusing
 * this template for a reset would sign people in from a link they asked for
 * because they had lost control of their password.
 *
 * The two promises in the body — works once, expires in 15 minutes — are load
 * bearing. `MAGIC_LINK_TTL_MS` in `src/components/auth/credentials-store.ts` is
 * what makes the second one true, and the single-use half is a delete-returning
 * on the token row. Change either and this copy changes with it.
 */

import type { TokenSchema } from "@/lib/token-render";

export const MAGIC_SIGN_IN_TOKENS = {
  /** The complete, single-use sign-in URL. */
  signInUrl: "url",
  /**
   * This deployment's host, as it appears in the anti-phishing sentence.
   *
   * The design wrote `familypantree.com` literally. Shipping that from a
   * deployment on another domain teaches the recipient that a link to a host
   * they are not about to visit is the legitimate one, which is the lesson a
   * phishing kit needs them to have learned.
   */
  siteDomain: "text",
  postalAddress: "text",
  preferencesUrl: "url",
} as const satisfies TokenSchema;

export const MAGIC_SIGN_IN_SUBJECT = "Your FamilyPantree sign-in link";

export const MAGIC_SIGN_IN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your FamilyPantree sign-in link</title>
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
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">One-time sign-in link. Works once and expires in 15 minutes.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efe8dc;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="wrap" style="width:600px; max-width:600px; background-color:#fdfbf7; border-radius:14px; overflow:hidden;">
<tr><td height="4" bgcolor="#c0562f" style="background-color:#c0562f; font-size:0; line-height:0;">&nbsp;</td></tr>
<tr><td class="pad" style="padding:28px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:bold; letter-spacing:-0.4px; color:#26211d; mso-line-height-rule:exactly; line-height:24px;">FamilyPan<span style="color:#6b7250;">tree</span></td>
</tr></table>
</td></tr>
<tr><td class="pad h1" style="padding:20px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:28px; font-weight:bold; letter-spacing:-0.5px; color:#26211d; mso-line-height-rule:exactly; line-height:34px;">Your sign-in link</td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:16px; color:#4a423b; mso-line-height-rule:exactly; line-height:24px;">Tap the button below and you will be signed in to FamilyPantree. No password needed.</td></tr>
<tr><td class="pad" style="padding:8px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#c0562f" style="background-color:#c0562f; border-radius:8px;">
<a href="{signInUrl}" style="display:block; padding:15px 28px; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; mso-line-height-rule:exactly; line-height:20px;">Sign in to FamilyPantree</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:24px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#f7f2ea; border-radius:14px;">
<tr><td style="padding:20px 20px 4px 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#8a5a44; mso-line-height-rule:exactly; line-height:20px;">Two things to know</td></tr>
<tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">It works once.</strong> Following the link uses it up.</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">It expires in 15 minutes.</strong> Request another from the sign-in screen if it has gone stale.</td></tr>
<tr><td style="padding:0 20px 20px 20px; font-size:0; line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
<tr><td class="pad" style="padding:24px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">This email comes from FamilyPantree. We will never ask you for your password, and a real sign-in link always goes to {siteDomain}.</td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">Did not ask for this? Someone may have typed your address by mistake. Ignore this email — the link cannot do anything on its own, and no one can see your cookbook.</td></tr>
<tr><td class="pad" style="padding:32px 40px 0 40px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td height="1" bgcolor="#e2dacf" style="background-color:#e2dacf; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:20px 40px 4px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">You received this because someone asked for a sign-in link for this address on {siteDomain}.</td></tr>
<tr><td class="pad" style="padding:4px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">{postalAddress}</td></tr>
<tr><td class="pad" style="padding:0 40px 32px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;"><a href="{preferencesUrl}" style="color:#7a7167; text-decoration:underline;">Manage email preferences</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const MAGIC_SIGN_IN_TEXT = `Your FamilyPantree sign-in link

Follow the link below and you will be signed in to FamilyPantree. No password
needed.

{signInUrl}

TWO THINGS TO KNOW
- It works once. Following the link uses it up.
- It expires in 15 minutes. Request another from the sign-in screen if it has
  gone stale.

This email comes from FamilyPantree. We will never ask you for your password,
and a real sign-in link always goes to {siteDomain}.

Did not ask for this? Someone may have typed your address by mistake. Ignore
this email - the link cannot do anything on its own, and no one can see your
cookbook.

You received this because someone asked for a sign-in link for this address on
{siteDomain}.
{postalAddress}
Manage email preferences: {preferencesUrl}`;

/**
 * "{inviter} added you to {household}" — the household invite.
 *
 * This is the design handoff's `emails/household-invite.html`, unchanged except
 * where a `{token}` stands in for a fact. It is NOT the group invite with a
 * different noun, and merging the two is the one refactor this file exists to
 * refuse: a household grants the pantry, the cart, the stores, the staples and
 * every shopping list, while a group grants recipe visibility and nothing else.
 * Someone who believed they were joining a recipe swap and landed in a
 * stranger's pantry is a privacy incident, and this email is the only thing
 * they read before deciding.
 *
 * The "What you would start sharing" panel is therefore the consent record. If
 * the sharing model changes, that panel changes with it, in the same commit.
 */

import type { TokenSchema } from "@/lib/token-render";

export const HOUSEHOLD_INVITE_TOKENS = {
  inviterFirstName: "text",
  inviterEmail: "text",
  householdName: "text",
  /** Formatted phrases, not bare numerals: "9 people", "1 person". */
  memberCount: "text",
  storeCount: "text",
  stapleCount: "text",
  /** The consent screen, without the query. The code is appended by the template. */
  joinUrl: "url",
  inviteCode: "urlPart",
  /** "7 days", "1 day", "under an hour" — computed from the real expiry. */
  expiresInDays: "text",
  postalAddress: "text",
  preferencesUrl: "url",
  reportUrl: "url",
} as const satisfies TokenSchema;

export const HOUSEHOLD_INVITE_SUBJECT =
  "{inviterFirstName} added you to {householdName} on FamilyPantree";

export const HOUSEHOLD_INVITE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{inviterFirstName} added you to {householdName} on FamilyPantree</title>
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
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">Joining a household shares the pantry, the cart and every shopping list. Expires in {expiresInDays}.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efe8dc;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="wrap" style="width:600px; max-width:600px; background-color:#fdfbf7; border-radius:14px; overflow:hidden;">
<tr><td height="4" bgcolor="#c0562f" style="background-color:#c0562f; font-size:0; line-height:0;">&nbsp;</td></tr>
<tr><td class="pad" style="padding:28px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:bold; letter-spacing:-0.4px; color:#26211d; mso-line-height-rule:exactly; line-height:24px;">FamilyPan<span style="color:#6b7250;">tree</span></td>
</tr></table>
</td></tr>
<tr><td class="pad h1" style="padding:20px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:28px; font-weight:bold; letter-spacing:-0.5px; color:#26211d; mso-line-height-rule:exactly; line-height:34px;">{inviterFirstName} added you to<br>{householdName}</td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:16px; color:#4a423b; mso-line-height-rule:exactly; line-height:24px;">A household on FamilyPantree is the people you cook and shop with. Right now that is {memberCount}. Joining links your account to theirs — this is more than sharing recipes, so it is worth reading the list below before you accept.</td></tr>
<tr><td class="pad" style="padding:24px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#f7f2ea; border-radius:14px;">
<tr><td style="padding:20px 20px 4px 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#a5361c; mso-line-height-rule:exactly; line-height:20px;">What you would start sharing</td></tr>
<tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">The pantry</strong> — what has been bought, and what has been used up</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">The recipe cart</strong> — anyone in the household can change what you are about to shop for</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">Stores, delivery ZIP and the staples list</strong> — {storeCount} and {stapleCount} today</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">Every shopping list</strong>, including estimated totals</td></tr>
<tr><td style="padding:0 20px 20px 20px; font-size:0; line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
<tr><td class="pad" style="padding:24px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#efe8dc; border-radius:14px;">
<tr><td style="padding:20px 20px 4px 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#6b7250; mso-line-height-rule:exactly; line-height:20px;">What stays yours</td></tr>
<tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;">Your own recipes stay private. Nothing in your cookbook becomes visible to the household unless you share it to a group.</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;">You can leave at any time, and the recipes you added stay in your cookbook.</td></tr>
<tr><td style="padding:0 20px 20px 20px; font-size:0; line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
<tr><td class="pad" style="padding:8px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#c0562f" style="background-color:#c0562f; border-radius:8px;">
<a href="{joinUrl}?code={inviteCode}" style="display:block; padding:15px 28px; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; mso-line-height-rule:exactly; line-height:20px;">Review and join {householdName}</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">You will see the full list again in the app before anything is shared. <strong style="color:#26211d;">This invite expires in {expiresInDays}.</strong></td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">Not expecting this? Ignore this email — nothing is shared until you accept. You can also <a href="{reportUrl}" style="color:#26211d;">report the invite</a>.</td></tr>
<tr><td class="pad" style="padding:32px 40px 0 40px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td height="1" bgcolor="#e2dacf" style="background-color:#e2dacf; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:20px 40px 4px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">You received this because {inviterEmail} entered this address when inviting someone to their FamilyPantree household.</td></tr>
<tr><td class="pad" style="padding:4px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">{postalAddress}</td></tr>
<tr><td class="pad" style="padding:0 40px 32px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;"><a href="{preferencesUrl}" style="color:#7a7167; text-decoration:underline;">Manage email preferences</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

/**
 * The text/plain alternative.
 *
 * Not an afterthought and not a stripped copy of the HTML: it carries the same
 * consent list, because a client that shows the text part is the one where a
 * missing sentence is invisible rather than merely ugly.
 */
export const HOUSEHOLD_INVITE_TEXT = `{inviterFirstName} added you to {householdName} on FamilyPantree

A household on FamilyPantree is the people you cook and shop with. Right now
that is {memberCount}. Joining links your account to theirs - this is more than
sharing recipes, so it is worth reading the list below before you accept.

WHAT YOU WOULD START SHARING
- The pantry: what has been bought, and what has been used up.
- The recipe cart: anyone in the household can change what you are about to
  shop for.
- Stores, delivery ZIP and the staples list: {storeCount} and {stapleCount}
  today.
- Every shopping list, including estimated totals.

WHAT STAYS YOURS
- Your own recipes stay private. Nothing in your cookbook becomes visible to
  the household unless you share it to a group.
- You can leave at any time, and the recipes you added stay in your cookbook.

Review and join {householdName}:
{joinUrl}?code={inviteCode}

You will see the full list again in the app before anything is shared. This
invite expires in {expiresInDays}.

Not expecting this? Ignore this email - nothing is shared until you accept.
You can also report the invite: {reportUrl}

You received this because {inviterEmail} entered this address when inviting
someone to their FamilyPantree household.
{postalAddress}
Manage email preferences: {preferencesUrl}`;

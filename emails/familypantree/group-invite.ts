/**
 * "{inviter} invited you to {group}" — the recipe-group invite.
 *
 * Kept separate from the household invite on purpose. The difference between
 * the two emails IS the product's privacy promise: a group shares recipes and
 * nothing else, and this body says so three times because the recipient has no
 * other way to know it before they decide. If you ever find yourself merging
 * this with `./household-invite`, read that file's comment first.
 *
 * Note what is absent, and keep it absent: no pantry, no cart, no stores, no
 * staples, no shopping lists.
 */

import type { TokenSchema } from "@/lib/token-render";

export const GROUP_INVITE_TOKENS = {
  inviterFirstName: "text",
  groupName: "text",
  /** Formatted phrases: "9 people", "1 person", "17 recipes", "1 recipe". */
  memberCount: "text",
  recipeCount: "text",
  /** The invite landing route, without the token. */
  joinUrl: "url",
  /** The invite token itself — the credential, appended as a path segment. */
  groupCode: "urlPart",
  postalAddress: "text",
  preferencesUrl: "url",
  reportUrl: "url",
} as const satisfies TokenSchema;

export const GROUP_INVITE_SUBJECT =
  "{inviterFirstName} invited you to {groupName} on FamilyPantree";

export const GROUP_INVITE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{inviterFirstName} invited you to {groupName} on FamilyPantree</title>
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
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">A recipe group — recipes only. Your pantry and shopping stay private.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efe8dc;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="wrap" style="width:600px; max-width:600px; background-color:#fdfbf7; border-radius:14px; overflow:hidden;">
<tr><td height="4" bgcolor="#6b7250" style="background-color:#6b7250; font-size:0; line-height:0;">&nbsp;</td></tr>
<tr><td class="pad" style="padding:28px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:Arial,Helvetica,sans-serif; font-size:19px; font-weight:bold; letter-spacing:-0.4px; color:#26211d; mso-line-height-rule:exactly; line-height:24px;">FamilyPan<span style="color:#6b7250;">tree</span></td>
</tr></table>
</td></tr>
<tr><td class="pad h1" style="padding:20px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:28px; font-weight:bold; letter-spacing:-0.5px; color:#26211d; mso-line-height-rule:exactly; line-height:34px;">{inviterFirstName} invited you to<br>{groupName}</td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:16px; color:#4a423b; mso-line-height-rule:exactly; line-height:24px;">A group on FamilyPantree is for trading recipes with a specific set of people. This one has {memberCount}, sharing {recipeCount} so far.</td></tr>
<tr><td class="pad" style="padding:24px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:#f7f2ea; border-radius:14px;">
<tr><td style="padding:20px 20px 4px 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; font-weight:bold; color:#6b7250; mso-line-height-rule:exactly; line-height:20px;">Recipes only</td></tr>
<tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;">You would see the recipes shared to this group, and choose which of your own to share back — one at a time.</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;"><strong style="color:#26211d;">Not your pantry. Not your stores or staples. Not your shopping lists.</strong> A group is nothing like joining a household.</td></tr><tr><td style="padding:8px 20px 0 20px; font-family:Arial,Helvetica,sans-serif; font-size:15px; color:#4a423b; mso-line-height-rule:exactly; line-height:22px;">The rest of your cookbook stays private, and you can leave whenever you like.</td></tr>
<tr><td style="padding:0 20px 20px 20px; font-size:0; line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>
<tr><td class="pad" style="padding:8px 40px 0 40px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#26211d" style="background-color:#26211d; border-radius:8px;">
<a href="{joinUrl}/{groupCode}" style="display:block; padding:15px 28px; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; mso-line-height-rule:exactly; line-height:20px;">View the group</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:20px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">Nothing is shared until you join, and joining never shares a recipe automatically — you pick each one.</td></tr>
<tr><td class="pad" style="padding:16px 40px 0 40px; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#7a7167; mso-line-height-rule:exactly; line-height:19px;">Not expecting this? Ignore this email, or <a href="{reportUrl}" style="color:#26211d;">report the invite</a>.</td></tr>
<tr><td class="pad" style="padding:32px 40px 0 40px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;"><tr><td height="1" bgcolor="#e2dacf" style="background-color:#e2dacf; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:20px 40px 4px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">You received this because a FamilyPantree member entered this address when inviting someone to a recipe group.</td></tr>
<tr><td class="pad" style="padding:4px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;">{postalAddress}</td></tr>
<tr><td class="pad" style="padding:0 40px 32px 40px; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#7a7167; mso-line-height-rule:exactly; line-height:18px;"><a href="{preferencesUrl}" style="color:#7a7167; text-decoration:underline;">Manage email preferences</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const GROUP_INVITE_TEXT = `{inviterFirstName} invited you to {groupName} on FamilyPantree

A group on FamilyPantree is for trading recipes with a specific set of people.
This one has {memberCount}, sharing {recipeCount} so far.

RECIPES ONLY
- You would see the recipes shared to this group, and choose which of your own
  to share back - one at a time.
- Not your pantry. Not your stores or staples. Not your shopping lists. A group
  is nothing like joining a household.
- The rest of your cookbook stays private, and you can leave whenever you like.

View the group:
{joinUrl}/{groupCode}

Nothing is shared until you join, and joining never shares a recipe
automatically - you pick each one.

Not expecting this? Ignore this email, or report the invite: {reportUrl}

You received this because a FamilyPantree member entered this address when
inviting someone to a recipe group.
{postalAddress}
Manage email preferences: {preferencesUrl}`;

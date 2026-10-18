/**
 * SaddleOut "You're in" — sent once to a rider who was waiting in the beta queue when
 * access became automatic. Transactional: the rider asked for beta access and ticked
 * "it's OK to email me about my place and how to install". The install links live on
 * their SaddleOut page (per device, and they can change), so the email carries one button.
 */

import type { TokenSchema } from "@/lib/token-render";

export const SADDLEOUT_BETA_ACCESS_TOKENS = {
  /** Their username, or "rider". */
  name: "text",
  /** "for your iPhone and Windows PC". */
  devices: "text",
  /** saddleout.com/#join (signs them in if needed, then shows the install links). */
  pageUrl: "url",
} as const satisfies TokenSchema;

export const SADDLEOUT_BETA_ACCESS_SUBJECT = "You're in the SaddleOut beta";

const F = "font-family:Arial,Helvetica,sans-serif;";
const MONO = "font-family:'JetBrains Mono',Menlo,Consolas,monospace;";
const HEAD = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;";

export const SADDLEOUT_BETA_ACCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>You're in the SaddleOut beta</title>
<style>
@media only screen and (max-width: 480px) {
.tag { display: none !important; }
}
@media only screen and (max-width: 600px) {
.wrap { width: 100% !important; }
.pad { padding-left: 22px !important; padding-right: 22px !important; }
.h1 { font-size: 28px !important; line-height: 32px !important; }
}
</style>
</head>
<body style="margin:0; padding:0; background-color:#EDECE4;">
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">Install, link your game, build a route.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EDECE4;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" class="wrap" style="width:560px; max-width:560px; background-color:#FBFAF5; border:1px solid #E3E1D5; border-radius:6px; overflow:hidden;">
<tr><td bgcolor="#070B09" class="pad" style="background-color:#070B09; padding:18px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="${F} font-size:20px; font-weight:bold; letter-spacing:2px; color:#F1F0E4; line-height:24px; white-space:nowrap;">SADDLE<img src="https://mailer.bangerterbuilds.com/brand/saddleout-o.png" width="20" height="20" alt="O" style="display:inline-block; width:20px; height:20px; border:0; vertical-align:-3px; margin:0 1px; color:#F2A72C;">UT</td>
<td align="right" class="tag" style="${MONO} font-size:9px; letter-spacing:1px; color:#93A388; line-height:24px; white-space:nowrap; padding-left:12px;">STAY IN. HEAD OUT.</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:32px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">BETA ACCESS</td></tr>
<tr><td class="pad h1" style="padding:8px 28px 0 28px; ${HEAD} font-size:34px; font-weight:bold; color:#0E1410; line-height:38px;">You're in, {name}.</td></tr>
<tr><td class="pad" style="padding:14px 28px 0 28px; ${F} font-size:15px; color:#3A4238; line-height:23px;">You're in the SaddleOut beta. Here's how to get riding, {devices}.</td></tr>
<tr><td class="pad" style="padding:24px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">1 &middot; INSTALL</td></tr>
<tr><td class="pad" style="padding:6px 28px 0 28px; ${F} font-size:15px; color:#3A4238; line-height:23px;">Your install buttons are on your SaddleOut page: the PC download, the TestFlight link for iPhone and iPad, and for Android, (1) join the tester group, then (2) install from Google Play.</td></tr>
<tr><td class="pad" style="padding:16px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#F2A72C" style="background-color:#F2A72C; border-radius:4px;">
<a href="{pageUrl}" style="display:block; padding:14px 26px; ${F} font-size:16px; font-weight:bold; color:#0E1410; text-decoration:none; line-height:20px;">Get SaddleOut</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:24px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">2 &middot; LINK YOUR GAME</td></tr>
<tr><td class="pad" style="padding:6px 28px 0 28px; ${F} font-size:15px; color:#3A4238; line-height:23px;">Open SaddleOut &gt; Settings &gt; Account and note the code, then enter it at <a href="https://saddleout.com/link" style="color:#8A5A0B;">saddleout.com/link</a>.</td></tr>
<tr><td class="pad" style="padding:24px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">3 &middot; BUILD YOUR OWN ROUTE</td></tr>
<tr><td class="pad" style="padding:6px 28px 0 28px; ${F} font-size:15px; color:#3A4238; line-height:23px;">Upload a GPX at <a href="https://saddleout.com/create" style="color:#8A5A0B;">saddleout.com/create</a> (1&ndash;20 miles). It takes about 30 minutes, and we&rsquo;ll email you when it&rsquo;s ready.</td></tr>
<tr><td class="pad" style="padding:24px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">4 &middot; SEND FEEDBACK</td></tr>
<tr><td class="pad" style="padding:6px 28px 0 28px; ${F} font-size:15px; color:#3A4238; line-height:23px;">Use SEND FEEDBACK in the game, or just reply to this email. It's an early build, so tell us what breaks.</td></tr>
<tr><td class="pad" style="padding:32px 28px 0 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="#E3E1D5" style="background-color:#E3E1D5; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:18px 28px 0 28px; ${F} font-size:12px; color:#7A8476; line-height:18px;">You're getting this because you signed up for the SaddleOut beta and asked us to email you about access.</td></tr>
<tr><td class="pad" style="padding:8px 28px 28px 28px; ${F} font-size:12px; color:#7A8476; line-height:18px;"><a href="https://saddleout.com/account" style="color:#7A8476; text-decoration:underline;">Account</a> &middot; <a href="https://saddleout.com/privacy" style="color:#7A8476; text-decoration:underline;">Privacy</a> &middot; SaddleOut, Long Beach, CA</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const SADDLEOUT_BETA_ACCESS_TEXT = `You're in, {name}.

You're in the SaddleOut beta. Here's how to get riding, {devices}.

1. INSTALL
Your install links are on your SaddleOut page: the PC download, the TestFlight
link for iPhone and iPad, and for Android, (1) join the tester group, then
(2) install from Google Play.
Get SaddleOut: {pageUrl}

2. LINK YOUR GAME
Open SaddleOut > Settings > Account and note the code, then enter it at
saddleout.com/link

3. BUILD YOUR OWN ROUTE
Upload a GPX at saddleout.com/create (1-20 miles). It takes about 30 minutes, and we'll email you when it's ready.

4. SEND FEEDBACK
Use SEND FEEDBACK in the game, or just reply to this email. It's an early build,
so tell us what breaks.

You're getting this because you signed up for the SaddleOut beta and asked us to
email you about access.
Account: https://saddleout.com/account
Privacy: https://saddleout.com/privacy
SaddleOut, Long Beach, CA`;

/**
 * SaddleOut "Create a route" emails to the rider who uploaded the route: queued, version 1
 * ready, version 2 ready, didn't build. Transactional: the rider's own upload caused each one.
 *
 * Two templates share this shell: `saddleout-route-update` (text only: queued, failed) and
 * `saddleout-route-ready` (adds the route's picture, from a signed link the site generates).
 */

import type { TokenSchema } from "@/lib/token-render";

const BASE_TOKENS = {
  /** "QUEUED · #3 IN LINE", "VERSION 1 READY". */
  eyebrow: "text",
  /** "Tunnel Creek is ready to ride". */
  headline: "text",
  /** One short paragraph. */
  body: "text",
  buttonLabel: "text",
  /** The route's page on saddleout.com. */
  buttonUrl: "url",
} as const satisfies TokenSchema;

export const SADDLEOUT_ROUTE_UPDATE_TOKENS = BASE_TOKENS;
export const SADDLEOUT_ROUTE_READY_TOKENS = { ...BASE_TOKENS, imageUrl: "url" } as const satisfies TokenSchema;

export const SADDLEOUT_ROUTE_SUBJECT = "{headline}";

const F = "font-family:Arial,Helvetica,sans-serif;";
const MONO = "font-family:'JetBrains Mono',Menlo,Consolas,monospace;";
const HEAD = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;";

function shell(picture: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>{headline}</title>
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
<span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all;">{body}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EDECE4;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" class="wrap" style="width:560px; max-width:560px; background-color:#FBFAF5; border:1px solid #E3E1D5; border-radius:6px; overflow:hidden;">
<tr><td bgcolor="#070B09" class="pad" style="background-color:#070B09; padding:18px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="${F} font-size:20px; font-weight:bold; letter-spacing:2px; color:#F1F0E4; line-height:24px; white-space:nowrap;">SADDLE<img src="https://mailer.bangerterbuilds.com/brand/saddleout-o.png" width="20" height="20" alt="O" style="display:inline-block; width:20px; height:20px; border:0; vertical-align:-3px; margin:0 1px; color:#F2A72C;">UT</td>
<td align="right" class="tag" style="${MONO} font-size:9px; letter-spacing:1px; color:#93A388; line-height:24px; white-space:nowrap; padding-left:12px;">CREATE A ROUTE</td>
</tr></table>
</td></tr>
${picture}<tr><td class="pad" style="padding:30px 28px 0 28px; ${MONO} font-size:11px; letter-spacing:2px; color:#8A5A0B; line-height:16px;">{eyebrow}</td></tr>
<tr><td class="pad h1" style="padding:8px 28px 0 28px; ${HEAD} font-size:32px; font-weight:bold; color:#0E1410; line-height:36px;">{headline}</td></tr>
<tr><td class="pad" style="padding:14px 28px 0 28px; ${F} font-size:16px; color:#3A4238; line-height:24px;">{body}</td></tr>
<tr><td class="pad" style="padding:22px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="#F2A72C" style="background-color:#F2A72C; border-radius:4px;">
<a href="{buttonUrl}" style="display:block; padding:14px 26px; ${F} font-size:16px; font-weight:bold; color:#0E1410; text-decoration:none; line-height:20px;">{buttonLabel}</a>
</td>
</tr></table>
</td></tr>
<tr><td class="pad" style="padding:32px 28px 0 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td height="1" bgcolor="#E3E1D5" style="background-color:#E3E1D5; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td class="pad" style="padding:18px 28px 0 28px; ${F} font-size:12px; color:#7A8476; line-height:18px;">You're getting this because you asked SaddleOut to build a route from your ride. Map data &copy; OpenStreetMap contributors.</td></tr>
<tr><td class="pad" style="padding:8px 28px 28px 28px; ${F} font-size:12px; color:#7A8476; line-height:18px;"><a href="https://saddleout.com/account" style="color:#7A8476; text-decoration:underline;">Account</a> &middot; <a href="https://saddleout.com/privacy" style="color:#7A8476; text-decoration:underline;">Privacy</a> &middot; SaddleOut, Mission Viejo, CA</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export const SADDLEOUT_ROUTE_UPDATE_HTML = shell("");
export const SADDLEOUT_ROUTE_READY_HTML = shell(
  `<tr><td style="padding:0; line-height:0; font-size:0;"><img src="{imageUrl}" width="560" alt="A first look at your route" style="display:block; width:100%; max-width:560px; height:auto; border:0;"></td></tr>\n`,
);

const TEXT = `{eyebrow}
{headline}

{body}

{buttonLabel}: {buttonUrl}

You're getting this because you asked SaddleOut to build a route from your ride.
Map data (c) OpenStreetMap contributors.
Account: https://saddleout.com/account
Privacy: https://saddleout.com/privacy
SaddleOut, Mission Viejo, CA`;

export const SADDLEOUT_ROUTE_UPDATE_TEXT = TEXT;
export const SADDLEOUT_ROUTE_READY_TEXT = `${TEXT}

Picture: {imageUrl}`;

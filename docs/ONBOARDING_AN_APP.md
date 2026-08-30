# Onboarding a new app

Worked example: **familypantree.com**, DNS at Cloudflare. Substitute your own domain
and appId anywhere you see those.

There are two halves, and they need different hands:

- **Part 1** — SES, DNS, and the mail-service config. A human with AWS and Cloudflare
  access does this. An agent cannot.
- **Part 2** — the app-side integration. Hand this to the agent working in the
  consuming app's repo. It never needs AWS credentials or this repo checked out.

Do Part 1 first. Part 2 can be written and tested against the console provider before
Part 1 finishes, but nothing reaches a real inbox until the domain is verified.

---

## Part 1 — human steps

### 1. Verify the domain in SES

From the `mail-service` repo root:

```bash
pnpm verify-domain familypantree.com
```

This creates the SES identity, sets the MAIL FROM subdomain to `mail.familypantree.com`,
and prints the DNS records. **It only prints — it never writes DNS.**

### 2. Add the records in Cloudflare

Add these **alongside** what is already there. Do not replace the zone.

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | `<token1>._domainkey` | `<token1>.dkim.amazonses.com` | **DNS only** |
| CNAME | `<token2>._domainkey` | `<token2>.dkim.amazonses.com` | **DNS only** |
| CNAME | `<token3>._domainkey` | `<token3>.dkim.amazonses.com` | **DNS only** |
| MX | `mail` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | n/a |
| TXT | `mail` | `v=spf1 include:amazonses.com ~all` | n/a |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@familypantree.com` | n/a |

Cloudflare-specific things that break this:

- **The three DKIM CNAMEs must be "DNS only" (grey cloud), not proxied (orange).** A
  proxied CNAME returns Cloudflare's IP instead of the CNAME target, so SES never sees
  the DKIM record and verification hangs forever. This is the single most common failure.
- **Check the resulting record name.** Cloudflare appends the zone to whatever you type.
  You want `abc._domainkey.familypantree.com`, not
  `abc._domainkey.familypantree.com.familypantree.com`. Paste the short name (`abc._domainkey`)
  and confirm what Cloudflare displays after saving.
- **Only add `_dmarc` if the domain does not already have one.** Two `_dmarc` TXT records
  break DMARC entirely. If one exists, leave it alone.
- **One SPF TXT per name.** The SPF above belongs on `mail`, not on the apex. If the apex
  already has an SPF record for another provider, do not touch it.
- **If Cloudflare Email Routing is enabled**, it manages apex MX records. Ours are on the
  `mail` subdomain and do not collide, but do not let the Email Routing wizard "clean up"
  records it does not recognize.

### 3. Wait for verification

```bash
pnpm check-domain familypantree.com --watch
```

Polls every 30s. You want `verified: YES` and `dkim status: SUCCESS`. Cloudflare
propagates fast — usually minutes.

### 4. Generate an API key

```bash
pnpm generate-key familypantree familypantree.com
```

Save the printed `key_live_...` somewhere safe. It is random and not recoverable — if you
lose it, generate a new one and swap it in.

### 5. Merge it into `APPS`

`APPS` is **one JSON object holding every app**. Adding an app means adding a key to that
object, not replacing it. Take the existing value from Vercel and merge:

```jsonc
{
  "key_live_<tript key>":        { "appId": "tript",         "from": "noreply@tript.io",         /* ... */ },
  "key_live_<familypantree key>":{ "appId": "familypantree", "from": "noreply@familypantree.com",
                                   "fromName": "Family Pantree",
                                   "templates": ["welcome", "password-reset", "verify-email"] }
}
```

Paste the merged single-line JSON back into the mail-service Vercel project's `APPS`
(Production + Preview) and redeploy. Confirm both apps appear:

```bash
curl -s https://mail.tript.io/api/health
```

`appIds` should list `tript` and `familypantree`.

Leave `configurationSet` out unless the SES configuration set of that name already exists —
naming one that does not exist fails every send.

### 6. Sandbox caveat

**Until AWS grants production access, sending to real familypantree.com users will fail.**
In the sandbox, recipients must themselves be verified identities. Verifying the *sending*
domain does not make arbitrary recipients reachable — only addresses at a verified domain
you control, plus the mailbox simulator.

So Part 2 can be built and tested, but real signup mail does not flow until production
access lands. Test with `success@simulator.amazonses.com` in the meantime.

---

## Part 2 — hand this to the app's agent

Everything below is self-contained. It needs no AWS access and no checkout of this repo.

### What this service is

`mail-service` is an internal HTTP API that sends transactional and notification email.
The app does not talk to AWS, does not render email, and does not choose a from-address.
It POSTs a template name and a data payload; the service does the rest.

**The API key determines the from-address.** The app cannot set `from`, `fromName`, or
`replyTo` — those come from server-side config keyed to the API key. Sending anything like
`from` in the body is silently ignored. Do not try to work around this.

### 1. Vendor the client

The client is a single dependency-free TypeScript file. Copy it into the app, e.g. as
`lib/mail-client.ts`:

https://raw.githubusercontent.com/bangerterj/mail-service/main/packages/client/src/index.ts

It uses only `fetch`. Do not add an AWS SDK, nodemailer, or an email-rendering library to
the app — that is the entire point of this service.

### 2. Environment variables

Exactly two:

```
MAIL_API_KEY=key_live_...
MAIL_SERVICE_URL=https://mail.tript.io
```

**`MAIL_API_KEY` is a server-only secret.** Never prefix it with `NEXT_PUBLIC_`, never
import the mail client into a client component, never call the API from the browser. A
leaked key lets anyone send mail as this domain. All calls belong in server actions, route
handlers, or backend jobs.

### 3. Send mail

```ts
import { createMailClient, MailError } from "@/lib/mail-client";

const mail = createMailClient({
  apiKey: process.env.MAIL_API_KEY!,
  baseUrl: process.env.MAIL_SERVICE_URL!,
});

await mail.send({
  to: user.email,
  template: "password-reset",
  data: { resetUrl: `https://familypantree.com/reset?token=${token}`, name: user.firstName },
});
```

Available templates and their exact `data` shapes:

| Template | `data` | Notes |
|---|---|---|
| `password-reset` | `{ resetUrl: string; name?: string }` | transactional |
| `verify-email` | `{ verifyUrl: string; name?: string }` | transactional |
| `welcome` | `{ name?: string; actionUrl?: string }` | transactional |
| `magic-sign-in` | `{ signInUrl: string; name?: string; expiresIn?: string }` | transactional — signs the recipient in; distinct from `verify-email`, which only proves address ownership |
| `mention` | `{ actorName: string; contextTitle: string; excerpt?: string; url: string }` | notification — requires `unsubscribeUrl` |
| `activity-digest` | `{ period: string; items: Array<{title: string; detail?: string; url?: string}>; actionUrl?: string }` | notification — requires `unsubscribeUrl` |
| `household-invite` | `{ inviterName: string; householdName: string; acceptUrl: string; shares: string[]; recipientName?: string; expiresIn?: string }` | notification — requires `unsubscribeUrl`. `shares` is the consent panel and is **required** |
| `group-invite` | `{ inviterName: string; groupName: string; acceptUrl: string; recipientName?: string; expiresIn?: string }` | notification — requires `unsubscribeUrl` |

#### Invites: household and group are deliberately different emails

`household-invite` and `group-invite` are separate templates and must stay that way.
A household grants pantry, cart, stores, staples and every shopping list; a group grants
recipe visibility only. Sending the wrong one misrepresents what the recipient is agreeing
to.

`household-invite` requires a non-empty `shares` array, rendered as a "What you would
start sharing" panel in both the HTML and plaintext parts. **That panel is the consent
record** — pass the real list of what accepting grants, not a summary:

```ts
await mail.send({
  to: invitee.email,
  template: "household-invite",
  data: {
    inviterName: inviter.displayName,
    householdName: household.name,
    acceptUrl: `https://familypantree.com/invite/${token}`,
    shares: ["Pantry inventory", "Shopping cart", "Saved stores", "Staples list", "Every shopping list"],
    expiresIn: "in 7 days",
  },
  unsubscribeUrl: `https://familypantree.com/invites/opt-out?token=${optOutToken}`,
});
```

`group-invite` states in the body that a group shares recipes only and explicitly does not
share pantry, cart, stores, staples or lists. It takes no `shares` array — the scope is
fixed and stated in the template, so it cannot drift.

Only the templates listed in this app's config are permitted; anything else returns 403.
URLs must be absolute and valid, or the send is a 400.

### 4. Notification email needs an opt-out

`mention` and `activity-digest` are notifications — caused by *someone else's* action — so
they require an `unsubscribeUrl`. Omitting it is a compile error in the client and a 400
from the server:

```ts
await mail.send({
  to: user.email,
  template: "mention",
  data: { actorName: "Jeff", contextTitle: "Weekly meal plan", url: threadUrl },
  unsubscribeUrl: `https://familypantree.com/settings/notifications?token=${optOutToken}`,
});
```

That URL must be a real, working one-click opt-out that disables this notification type for
this user. Gmail and Yahoo require it, and the service sends it as a `List-Unsubscribe`
header plus a visible footer link.

**Notification preferences live in this app, not in the mail service.** The app owns the
user table and decides whether to send at all; the service just transmits the URL. Check
the user's preference *before* calling `send`.

Transactional mail (password reset, verification) has no unsubscribe, by design — nobody
should be able to opt out of resetting their own password.

### 5. Handle the outcomes

```ts
try {
  await mail.send({ /* ... */ });
} catch (err) {
  if (err instanceof MailError) {
    if (err.isRateLimited) {
      // err.retryAfter is seconds; back off and retry later
    } else if (err.isInvalidRequest) {
      // 400/403 — a bug in the call. Log it; retrying will not help.
    } else if (err.isRetryable) {
      // network/5xx — the client already retried once
    }
  }
  throw err;
}
```

Two non-obvious behaviors:

- **A success response can mean "not sent."** If every recipient is on the suppression
  list (hard bounce or spam complaint), the API returns `200 { status: "suppressed" }`
  rather than an error, because retrying would be pointless. Check `result.status` if the
  distinction matters. A real send returns `202 { id, status: "sent" }`.
- **The client already retries once** on network errors and 5xx, with a 10s timeout. Do
  not wrap it in another retry loop.

Email sending should not block the user's request path. Prefer a background job or
fire-and-forget with error logging over making signup wait on an SMTP round trip.

### 6. Test without sending anything

Point `MAIL_SERVICE_URL` at a local mail-service running with `EMAIL_PROVIDER=console`,
which logs the rendered email instead of sending. Or, in the app's own tests, inject a
fake: `createMailClient` accepts a `fetch` option, so pass a stub and assert on the
request body.

While the SES account is in the sandbox, real sends only work to verified addresses and to
`success@simulator.amazonses.com`.

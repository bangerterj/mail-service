# mail-service

A small multi-tenant transactional and notification email API — a "mini Resend" — deployed
as a single Vercel project, backed by Amazon SES.

```
app A ─┐
app B ─┼──► POST https://mail.<domain>/api/send ──► AWS SES ──► inbox
app C ─┘     (this service, on Vercel)
                    ▲
                    └── per-app API key decides the from-address
```

**The API key determines the from-address.** Callers never supply one. A leaked key can
only send as its own app's domain. That is the core security property, and it is covered
by an explicit test.

This is a routing and access layer, not a mail server. Delivery, IP reputation, DKIM
signing and retries are SES's job.

---

## Quick start (no AWS needed)

```bash
pnpm install
cp .env.example .env.local   # EMAIL_PROVIDER=console is already set
pnpm dev
```

With `EMAIL_PROVIDER=console` the rendered email is logged instead of sent, so local
development needs no AWS credentials at all.

```bash
curl -s http://localhost:3000/api/health
```

```bash
curl -X POST http://localhost:3000/api/send -H "authorization: Bearer $MAIL_API_KEY" -H "content-type: application/json" -d '{"to":"user@example.com","template":"password-reset","data":{"resetUrl":"https://example.com/reset?t=abc"}}'
```

Preview the templates in a browser:

```bash
pnpm email:dev
```

---

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `APPS` | yes | JSON map of API key → app config (below) |
| `AWS_REGION` | yes | `us-east-1` — **fixed**, see `AWS_HANDOFF.md` |
| `MAIL_AWS_ACCESS_KEY_ID` | yes | IAM user scoped to SES send only |
| `MAIL_AWS_SECRET_ACCESS_KEY` | yes | — |
| `EMAIL_PROVIDER` | no | `ses` (default) or `console` for local dev |
| `UPSTASH_REDIS_REST_URL` | no | rate limiting + suppression; disabled if unset |
| `UPSTASH_REDIS_REST_TOKEN` | no | — |
| `SES_WEBHOOK_SECRET` | no | shared secret in the SNS subscription URL |

Do not prefix these with `NEXT_PUBLIC_`. The credentials carry a `MAIL_` prefix because
Vercel reserves the bare `AWS_*` names in some integration contexts.

**The region is fixed at `us-east-1`.** SES identities, production access, and
configuration sets are all per-region, and the verified domains live there. Keep Vercel
functions in the default `iad1` region, which is co-located with it. `verify-domain`
refuses to run against any other region.

### `APPS` shape

```jsonc
{
  "key_live_meal_a1b2c3...": {
    "appId": "meal-picker",
    "from": "noreply@mealpicker.com",
    "fromName": "Meal Picker",
    "replyTo": "support@mealpicker.com",              // optional
    "templates": ["welcome", "password-reset", "verify-email", "mention"],
    "configurationSet": "meal-picker",                // optional; see below
    "rateLimit": { "requests": 100, "window": "1h" }  // optional; defaults to this
  }
}
```

**`configurationSet`** names an SES configuration set — one per app, named after the
`appId`. It gives per-app delivery/bounce/complaint metrics and per-app CloudWatch alarms
for free, and is the low-cost substitute for SES Tenants. It is passed through as
`ConfigurationSetName` when present and **omitted entirely when absent**, so the service
works fine before the sets exist.

Only add the field once the set actually exists in AWS — naming a set that does not exist
fails every send. Leave engagement/open/click tracking **off** on these sets: it rewrites
every link through an AWS redirect domain, which is unacceptable on password-reset and
verification email.

Parsed and validated with zod at module load. Invalid JSON, an unknown template name, a
non-email `from`, or a duplicate `appId` crashes at boot — misconfiguration fails loud.
A missing Redis URL only disables rate limiting and the suppression list, with a warning.

Generate a key and a ready-to-paste config fragment:

```bash
pnpm generate-key meal-picker mealpicker.com
```

> **On Windows PowerShell**, pnpm 12 swallows script output — the command appears to do
> nothing and exits 0 (even bare `pnpm run` prints no script list). It works in Git Bash.
> From PowerShell, use npm or call the script directly:
>
> ```
> npm run generate-key --silent -- meal-picker mealpicker.com
> ```

---

## API

### `POST /api/send`

```
Authorization: Bearer key_live_...
Content-Type: application/json

{
  "to": "user@example.com",          // string or string[], max 10
  "template": "password-reset",
  "data": { "resetUrl": "https://...", "name": "Jeff" },
  "idempotencyKey": "optional-string",
  "unsubscribeUrl": "https://..."    // required for notification templates only
}
```

Pipeline: auth (constant-time key comparison) → body validation → template allowlist →
notification opt-out check → rate limit → suppression → render (HTML **and** plaintext) →
send → `202 { id, status: "sent" }`.

One structured JSON log line per request, carrying the recipient **domain only** — full
addresses are PII and never logged.

#### Errors

`{ "error": { "code", "message", "details?" } }`

| Status | Code | Meaning |
|---|---|---|
| 400 | `validation_error` | Bad body, bad template data, or a notification with no `unsubscribeUrl` |
| 401 | `unauthorized` | Missing or unknown API key |
| 403 | `template_not_allowed` | Template not in this app's allowlist |
| 429 | `rate_limited` | Over the limit; carries `Retry-After` |
| 502 | `provider_error` | SES rejected the send (detail is logged, never returned) |
| 500 | `internal_error` | Unexpected |

A send where every recipient is suppressed returns **`200 { status: "suppressed" }`**, not
an error — surfacing it as one makes callers retry into a wall.

### `GET /api/health`

Reports the parsed app count, provider, template list, and whether Redis and the webhook
secret are configured. Hit this right after the first deploy.

### `POST /api/webhooks/ses?secret=...`

SNS receiver for bounces and complaints. See [Bounce handling](#bounce-and-complaint-handling).

---

## Transactional vs. notification

Every template declares a `category`, and the category changes send behavior. This is
enforced in code rather than left to convention.

| | `transactional` | `notification` |
|---|---|---|
| Caused by | the recipient's own action | someone else's action |
| Templates | `password-reset`, `verify-email`, `welcome` | `mention`, `activity-digest` |
| `unsubscribeUrl` | rejected (ignored) | **required** — 400 without it |
| `List-Unsubscribe` headers | none | `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` |
| Visible footer opt-out | no | yes, rendered by the shared layout |
| Blocked by a complaint | **no** | yes |

**Notification preferences live in the consuming app, not here.** The app owns its user
table, knows what its notification types mean, and decides whether to send at all. This
service stores no preferences and has no user model — it only transmits the unsubscribe
URL the app supplies. Do not add a preferences database here.

Custom headers are not expressible through SESv2's simple content shape, so notification
mail goes out as raw MIME (built with `nodemailer`'s `MailComposer` — used only to
*build* the message, never to send). That is contained to `lib/mime.ts` and
`lib/providers/ses.ts`; routes and templates know nothing about MIME.

---

## Bounce and complaint handling

Sending to addresses that hard-bounce is the fastest way to get an SES account suspended.
This is the ongoing responsibility SES hands you that Resend absorbed.

**Suppression is category-aware.** Two lists:

- **hard bounce → suppresses everything.** The address is dead.
- **complaint → suppresses notifications only.** Blocking a password reset because
  someone spam-reported a mention email would lock them out of their own account.

Soft/transient bounces are ignored.

### Wiring it up

1. Create an SNS topic, e.g. `mail-service-events`.
2. In the SES console, configure the domain (or a configuration set) to publish `Bounce`
   and `Complaint` events to that topic.
3. Subscribe the topic to `https://mail.<your-domain>/api/webhooks/ses?secret=<SES_WEBHOOK_SECRET>`
   (HTTPS subscription).
4. SNS immediately posts a `SubscriptionConfirmation`. The route fetches the
   `SubscribeURL` automatically — **the subscription is not active until it does.** Confirm
   the subscription shows as `Confirmed` in the SNS console.

The endpoint is public, so it verifies the SNS message signature against the AWS-hosted
signing certificate (rejecting any non-`sns.<region>.amazonaws.com` cert URL) **and**
requires the shared secret in the query string.

If Redis is not configured, suppression no-ops with a prominent warning. SES maintains its
own account-level suppression list as a backstop — degraded, but not dangerous.

---

## AWS setup

1. **Pick a region.** `us-east-1` is fine. Use the same one everywhere.

2. **Create an IAM user** with no console access and this inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetEmailIdentity",
        "ses:CreateEmailIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

Generate an access key and set `MAIL_AWS_ACCESS_KEY_ID` / `MAIL_AWS_SECRET_ACCESS_KEY`.
Raw-MIME sending uses the same `ses:SendEmail` permission — nothing extra is needed.

3. **Verify each domain:**

   The MAIL FROM subdomain is always `mail.<domain>`, and "Behavior on MX failure" stays
   at **Use default MAIL FROM domain** so a DNS problem degrades alignment rather than
   dropping auth email.

```bash
pnpm verify-domain mealpicker.com
```

This creates the SES identity, configures a custom MAIL FROM subdomain, and prints the
exact DNS records to add: 3 DKIM CNAMEs (Easy DKIM, RSA-2048), the MAIL FROM MX and SPF
TXT, and a starter DMARC record.

**The script only prints records — it never writes DNS.** These domains carry live traffic
and live email from other providers, so add the records by hand, alongside what is already
there. On `tript.io` specifically, the `send` MX/TXT and `resend._domainkey` (Resend) and
`smtp._domainkey` plus the apex MX/SPF (Mailgun via Squarespace) are load-bearing and must
not be touched; ours live under `mail.` and coexist deliberately. If a `_dmarc` record
already exists, leave it alone — a second one breaks DMARC.

Then poll until verified:

```bash
pnpm check-domain mealpicker.com --watch
```

4. **Request production access** to leave the SES sandbox. Until granted you can only send
   to verified addresses. Describe **both** categories honestly — do not describe the
   account as transactional-only and then send notifications:

   > Transactional authentication email (password reset, email verification, welcome) and
   > in-app activity notifications (e.g. "someone mentioned you") sent to registered users
   > of our own applications. All recipients are registered account holders on domains we
   > own; no purchased or scraped lists. Bounces and complaints are processed via SNS into
   > a suppression list checked before every send. All notification email includes
   > `List-Unsubscribe` with one-click support and a visible unsubscribe link; users can
   > disable notifications in-app. Expected volume is under a few thousand messages per
   > month.

   Adjust the volume figure to your real estimate — understating it is not useful, since
   the quota rises automatically with clean sending history. Typically approved within a day.

5. **Create the SNS topic and subscribe the webhook** (previous section). This has to
   happen after the first deploy, since the subscription needs a reachable HTTPS URL.

### Sandbox limits

Until production access is granted the account is in the SES sandbox: **200 messages per
24h, 1 per second**, and recipients must be verified identities. A verified *domain*
covers every address at it, so any `@tript.io` address already works as a recipient — as
do the mailbox simulator addresses, which need no verification at all.

### Account settings that are deliberately off

Do not turn these on without a reason:

- **Engagement tracking** — rewrites every link through an AWS redirect domain. If
  per-message tracking is ever needed for non-auth mail, scope it to a configuration set
  for those templates only.
- **Auto Validation** — can silently suppress sends on a validity heuristic; a false
  positive means a user never gets a password reset and no error surfaces. Our
  bounce-driven suppression list replaces it.
- **Dedicated IPs** — ~$25/mo each and actively harmful at low volume. Shared pool only.

---

## Client package

Consuming apps import `packages/client` and end up with exactly two env vars and no AWS
SDK in their bundle.

```ts
import { createMailClient, MailError } from "@mail-service/client";

const mail = createMailClient({
  apiKey: process.env.MAIL_API_KEY!,
  baseUrl: process.env.MAIL_SERVICE_URL!,
});

await mail.send({
  to: user.email,
  template: "password-reset",
  data: { resetUrl },
});

// Notification templates require unsubscribeUrl — omitting it is a compile error.
await mail.send({
  to: user.email,
  template: "mention",
  data: { actorName: "Jeff", contextTitle: "Q3 planning", url },
  unsubscribeUrl: `https://mealpicker.com/settings/notifications?t=${token}`,
});
```

Template names and their `data` shapes are typed, so a wrong field fails at compile time.
10s timeout, one retry on network error or 5xx (never on a 4xx), and typed errors —
`err.isRateLimited`, `err.isInvalidRequest`, `err.isRetryable`, `err.retryAfter`.

---

## Adding an app

1. `pnpm generate-key <app-id> <domain>`
2. Merge the printed fragment into the `APPS` env var in Vercel.
3. `pnpm verify-domain <domain>`, add the DNS records, `pnpm check-domain <domain>`.
4. Redeploy. Config-as-code: no database row, no dashboard.

## Adding a template

1. Add `emails/<name>.tsx` with a component and a plaintext renderer.
2. Register it in `emails/index.ts` with a `category`, a zod `schema`, and a `subject`.
3. Add it to the relevant apps' `templates` allowlist.
4. Mirror the `data` shape in `packages/client/src/index.ts` (and in
   `NotificationTemplate` if it is a notification).

---

## Testing

```bash
pnpm test        # 89 tests
pnpm typecheck
pnpm build
```

Covered: config parsing (malformed JSON, unknown template, bad from-address, duplicate
appId), auth (unknown/missing/prefix keys), template data validation, category-aware
suppression, MIME construction, the SNS webhook (subscription confirmation, hard vs. soft
bounce, complaint scope, secret, cert-URL rejection), and the client.

Against real SES, a sandbox-safe smoke test using the mailbox simulator (these addresses
need no verification and do not affect reputation):

```bash
pnpm smoke:ses --all
```

It sends `success@`, `bounce@` and `complaint@simulator.amazonses.com` through the SES
provider directly. The bounce and complaint come back asynchronously via SNS — once the
topic is subscribed, confirm `bounce@` lands in `mail:suppressed:all` and `complaint@` in
`mail:suppressed:notification`.

The load-bearing route assertions:

- the from-address comes from config and **cannot** be overridden by the request body
- a template outside the app's allowlist is a `403`
- a notification template with no `unsubscribeUrl` is a `400`
- notification sends carry both `List-Unsubscribe` headers; transactional sends carry neither
- a complaint blocks a `mention` to that address but the `password-reset` still goes out
- `ConfigurationSetName` is set only when the app config supplies one, and can never be
  set from the request body

---

## Deployment

- Vercel project, root directory = repo root.
- Set every env var above (Production + Preview).
- Add a custom domain, e.g. `mail.<your-domain>`.
- API routes run on the **Node runtime** — the AWS SDK does not work on edge.
- After the first deploy, hit `/api/health` and confirm the app count and provider.

## Out of scope

Admin dashboard, database, user accounts, marketing/bulk email, notification preference
storage (lives in each consuming app), open/click tracking, inbound email, scheduled
sends, per-app analytics. If any become necessary, the config-as-code model should move to
a database first — but not before there are enough apps to justify it.

# Implementation Plan: Self-Hosted Transactional Email Service

> **For the implementing agent:** This is a complete, standalone spec. You do not need
> prior conversation context. Build it in the repo you have been pointed at.

---

## 1. What you are building

A small multi-tenant transactional email API — a "mini Resend" — deployed as a single
Vercel project, backed by Amazon SES.

Several independent web apps (currently 3, designed to grow to ~10) need auth email:
signup verification, password reset, welcome. Each app has its **own domain** and must
send from that domain. Today each app has its own free Resend account, which does not
scale. Paid Resend is $20/mo; SES is $0.10 per 1,000 emails with no monthly floor, and
verifies unlimited domains on one account for free. That price difference is the entire
reason this service exists.

```
app A ─┐
app B ─┼──► POST https://mail.<domain>/api/send ──► AWS SES ──► inbox
app C ─┘     (this service, on Vercel)
                    ▲
                    └── per-app API key decides the from-address
```

**This service is a routing and access layer, not a mail server.** Delivery, IP
reputation, DKIM signing, and retries are all SES's job. Do not attempt to send SMTP
directly from Vercel — it does not work and the mail would not be delivered.

### Design principles (do not violate these)

1. **The API key determines the from-address.** Callers never supply a from-address. A
   leaked key can only send as its own app's domain. This is the core security property.
2. **Config-as-code.** Adding an app is a config entry plus a redeploy, not a database
   row and not a dashboard. Explicitly out of scope: admin UI, user accounts, billing.
3. **Provider-agnostic core.** All SES calls go behind one `EmailProvider` interface so
   the backend can be swapped without touching routes, templates, or client apps.
4. **Fail loud on misconfiguration, fail soft on optional deps.** A malformed `APPS`
   config should crash at boot. A missing Redis URL should disable rate limiting with a
   warning, not crash.

---

## 2. Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- `@aws-sdk/client-sesv2` for sending
- `react-email` + `@react-email/components` for templates
- `zod` for request validation
- `@upstash/ratelimit` + `@upstash/redis` for rate limiting (optional at runtime)
- `vitest` for tests
- pnpm

---

## 3. Repo layout

```
.
├── app/
│   ├── api/
│   │   ├── send/route.ts             # main send endpoint
│   │   ├── health/route.ts           # liveness + config sanity
│   │   └── webhooks/ses/route.ts     # SNS bounce/complaint receiver
│   └── layout.tsx                    # minimal; no real UI
├── lib/
│   ├── config.ts                     # APPS parsing + validation (zod)
│   ├── auth.ts                       # bearer key -> AppConfig
│   ├── ratelimit.ts                  # Upstash wrapper, no-op if unset
│   ├── suppression.ts                # bounce/complaint suppression list
│   ├── logger.ts                     # structured JSON logging
│   └── providers/
│       ├── types.ts                  # EmailProvider interface
│       ├── ses.ts                    # SES implementation
│       └── console.ts                # dev/test implementation
├── emails/
│   ├── index.ts                      # template registry
│   ├── password-reset.tsx
│   ├── verify-email.tsx
│   ├── welcome.tsx
│   └── components/layout.tsx         # shared shell
├── packages/client/                  # published/consumed by the apps
│   ├── src/index.ts
│   └── package.json
├── scripts/
│   ├── verify-domain.ts
│   ├── check-domain.ts
│   └── generate-key.ts
├── tests/
└── README.md
```

---

## 4. Environment variables

| Var | Required | Purpose |
|---|---|---|
| `APPS` | yes | JSON map of API key → app config (see below) |
| `AWS_REGION` | yes | e.g. `us-east-1` |
| `MAIL_AWS_ACCESS_KEY_ID` | yes | IAM user with `ses:SendEmail` only |
| `MAIL_AWS_SECRET_ACCESS_KEY` | yes | — |
| `EMAIL_PROVIDER` | no | `ses` (default) or `console` for local dev |
| `UPSTASH_REDIS_REST_URL` | no | rate limiting + suppression; disabled if unset |
| `UPSTASH_REDIS_REST_TOKEN` | no | — |
| `SES_WEBHOOK_SECRET` | no | shared secret in the SNS subscription URL |

> Do not prefix these with `NEXT_PUBLIC_`. Vercel reserves the bare `AWS_*` names in some
> integration contexts, hence the `MAIL_` prefix on the credentials.

### `APPS` shape

```jsonc
{
  "key_live_meal_a1b2c3...": {
    "appId": "meal-picker",
    "from": "noreply@mealpicker.com",
    "fromName": "Meal Picker",
    "replyTo": "support@mealpicker.com",     // optional
    "templates": ["welcome", "password-reset", "verify-email"],
    "rateLimit": { "requests": 100, "window": "1h" }   // optional, has a default
  }
}
```

Parse and validate with zod at module load in `lib/config.ts`. Throw on invalid JSON,
unknown template names, or a non-email `from`. Build a `Map<key, AppConfig>` once at
module scope so it is not re-parsed per request.

---

## 5. The send endpoint

`POST /api/send`

```
Authorization: Bearer key_live_...
Content-Type: application/json

{
  "to": "user@example.com",              // string or string[], max 10
  "template": "password-reset",
  "data": { "resetUrl": "https://...", "name": "Jeff" },
  "idempotencyKey": "optional-string"
}
```

Request pipeline, in order:

1. **Auth** — extract bearer token, look up in the `APPS` map. Use a
   **constant-time comparison** when matching (`crypto.timingSafeEqual`) to avoid a
   timing side channel on key lookup. Missing/unknown → `401`.
2. **Validate** — zod schema on the body. Malformed → `400` with field errors.
3. **Authorize template** — `template` must be in that app's `templates` allowlist.
   Not allowed → `403`. This prevents one app from rendering another's templates.
4. **Rate limit** — keyed on `appId`. Over limit → `429` with `Retry-After`.
5. **Suppression check** — drop recipients on the suppression list. If all recipients are
   suppressed, return `200` with `{ status: "suppressed" }` — this is not an error, and
   surfacing it as one causes callers to retry into a wall.
6. **Render** — render the React Email template to HTML **and** a plaintext fallback.
   Always send both parts; HTML-only mail is a strong spam signal.
7. **Send** — via the `EmailProvider`. Set the from-address, name, and reply-to from the
   **app config**, never from the request body.
8. **Respond** — `202` with `{ id: <providerMessageId>, status: "sent" }`.

Log one structured JSON line per request: `appId`, `template`, recipient **domain only**
(never the full address — that is PII in logs), latency, outcome, provider message id.

### Error contract

Return a consistent JSON error body: `{ error: { code, message } }`. Use `400` validation,
`401` auth, `403` template not allowed, `429` rate limited, `502` provider failure,
`500` unexpected. Never leak the AWS error verbatim to the caller — log it, return a
generic `502`.

---

## 6. Provider interface

```ts
// lib/providers/types.ts
export interface SendParams {
  to: string[];
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(params: SendParams): Promise<{ id: string }>;
}
```

`ses.ts` implements it with `SendEmailCommand` from `@aws-sdk/client-sesv2`. Instantiate
the SES client once at module scope (reused across warm invocations). `console.ts` logs
the rendered email and returns a fake id — this is what `EMAIL_PROVIDER=console` selects,
so local development needs no AWS credentials at all.

Retry once on transient SES errors (throttling, 5xx); do not retry on validation errors
or suppressed-address rejections.

---

## 7. Templates

Each template is a React Email component plus a zod schema for its `data` payload, both
registered in `emails/index.ts`:

```ts
export const templates = {
  "password-reset": {
    schema: z.object({ resetUrl: z.string().url(), name: z.string().optional() }),
    subject: (d) => "Reset your password",
    component: PasswordResetEmail,
  },
  // ...
};
```

The send route validates `data` against the template's own schema — so a missing
`resetUrl` is a `400`, not a broken email in someone's inbox.

Build three templates: `password-reset`, `verify-email`, `welcome`. Keep them plain and
text-forward — a single-column layout, a real `<a>` button, the URL also shown as visible
text (some clients strip buttons). Share a `components/layout.tsx` shell that takes the
app's display name so one template serves all apps.

Add `pnpm email:dev` running `email dev` for local template preview.

---

## 8. Bounce and complaint handling

**Do not skip this.** Sending to addresses that hard-bounce is the single fastest way to
get an SES account suspended, and it is the main ongoing responsibility SES hands you that
Resend absorbed for you.

- Create an SNS topic; configure SES to publish `Bounce` and `Complaint` events to it.
- Subscribe the topic to `POST /api/webhooks/ses?secret=<SES_WEBHOOK_SECRET>`.
- The route must handle SNS's `SubscriptionConfirmation` message type by fetching the
  `SubscribeURL` — the subscription is not active until it does. This is the step that
  most often gets missed; test it explicitly.
- On `Notification`: parse the SES event. Add **hard** bounces and **all** complaints to
  the suppression list. Ignore soft/transient bounces.
- **Verify the SNS message signature** if practical; at minimum require the shared secret
  in the query string. This endpoint is public.

`lib/suppression.ts`: Redis set, `sismember` on send, `sadd` on webhook. If Redis is not
configured, log a prominent warning and no-op — SES maintains its own account-level
suppression list as a backstop, so this is degraded but not dangerous.

---

## 9. Scripts

- `scripts/generate-key.ts` — emits `key_live_<32 random hex>` plus a ready-to-paste
  `APPS` JSON fragment.
- `scripts/verify-domain.ts <domain>` — calls SES `CreateEmailIdentity`, configures a
  custom MAIL FROM subdomain, and prints the exact DNS records to add as a table:
  3 DKIM CNAMEs, the MAIL FROM MX and SPF TXT, and a suggested DMARC record
  (`v=DMARC1; p=none; rua=...` to start).
- `scripts/check-domain.ts <domain>` — polls `GetEmailIdentity` and reports verification
  and DKIM status.

These are what make onboarding a new domain a 10-minute job instead of a scavenger hunt
through the AWS console.

---

## 10. Client package

`packages/client` — a thin typed wrapper the consuming apps import.

```ts
const mail = createMailClient({
  apiKey: process.env.MAIL_API_KEY!,
  baseUrl: process.env.MAIL_SERVICE_URL!,
});

await mail.send({
  to: user.email,
  template: "password-reset",
  data: { resetUrl },
});
```

Requirements: zero heavy dependencies (use `fetch`), template names and their `data`
shapes typed so a wrong field is a compile error, a sensible timeout (10s), one retry on
network error or `5xx`, and typed errors so callers can distinguish rate-limited from
invalid. Consuming apps end up with exactly two env vars and no AWS SDK in their bundle.

---

## 11. AWS setup (document this in the README, step by step)

1. Create/choose an AWS account and pick one region (`us-east-1` is fine).
2. Create an IAM user with an inline policy allowing **only** `ses:SendEmail`,
   `ses:SendRawEmail`, `ses:GetEmailIdentity`, `ses:CreateEmailIdentity`. No console
   access. Generate an access key.
3. For each domain: run `verify-domain`, add the printed DNS records, wait, then
   `check-domain` until verified.
4. **Request production access** to leave the SES sandbox. Until this is granted you can
   only send to verified addresses. In the request, describe: transactional
   authentication email only, to opt-in users, on domains you own, with bounce and
   complaint handling wired to SNS, and an unsubscribe path for anything non-transactional.
   Typically approved within a day.
5. Create the SNS topic and subscribe the webhook (section 8).
6. Set the default sending rate expectations — SES starts new accounts at a modest quota
   which raises automatically with clean sending history.

---

## 12. Testing

- Unit: config parsing (valid, malformed JSON, unknown template, bad from-address), auth
  (valid/unknown/missing key, constant-time path), template `data` validation, suppression.
- Route: mock the provider; assert the from-address comes from config and **cannot** be
  overridden by the request body — make this an explicit test, it is the key security
  property. Assert `403` on a template outside the allowlist.
- Webhook: SNS `SubscriptionConfirmation` handling, hard bounce adds to suppression, soft
  bounce does not.
- Manual: with `EMAIL_PROVIDER=console`, run the app and curl each template.

---

## 13. Deployment

- Vercel project, connected to the repo, root directory = repo root.
- Set all env vars from section 4 in Vercel (Production + Preview).
- Add a custom domain, e.g. `mail.<your-domain>`.
- Node runtime for the API routes (the AWS SDK needs it — do not use the edge runtime).
- After first deploy, hit `/api/health` and confirm it reports the parsed app count and
  provider.

---

## 14. Build order

1. Scaffold, config + auth, `/api/health` — get the config layer right first.
2. Provider interface + `console` provider + one template + `/api/send`. End-to-end
   locally with no AWS.
3. SES provider, domain scripts, README AWS walkthrough.
4. Remaining templates.
5. Rate limiting + suppression.
6. SNS webhook.
7. Client package.
8. Tests, deploy, onboard the first app.

Ship steps 1–3 before touching anything else; that is the point where the thing is real.

---

## 15. Explicitly out of scope

Admin dashboard, database, user accounts, marketing/bulk email, unsubscribe management,
open/click tracking, inbound email, scheduled sends, per-app analytics. If any of these
become necessary, the config-as-code model should move to a database first — but not
before there are enough apps to justify it.

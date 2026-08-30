# AWS / SES Handoff — confirmed environment facts

Companion to `MAIL_SERVICE_PLAN.md`. Everything below is **already provisioned and
verified in the AWS console** — do not re-create it, and do not change these values.

---

## 1. Region

```
AWS_REGION=us-east-1
```

**This is fixed.** SES identities, production access, and configuration sets are all
per-region. Do not use any other region anywhere in the code, scripts, or docs.

Vercel functions should stay in the default `iad1` region (co-located with us-east-1).
Do not set a different function region.

## 2. Credentials

An IAM user `mail-service` exists with a customer-managed policy `mail-service-ses`.
No console access. Access keys are **already in `.env`** as:

```
MAIL_AWS_ACCESS_KEY_ID=...
MAIL_AWS_SECRET_ACCESS_KEY=...
```

Note the `MAIL_` prefix — Vercel reserves bare `AWS_*` names in some contexts. Read these
exact names in the SES provider. Never log them, never echo them, never commit `.env`.

The policy grants only:

- `ses:SendEmail`, `ses:SendRawEmail`
- `ses:CreateEmailIdentity`, `ses:GetEmailIdentity`, `ses:ListEmailIdentities`,
  `ses:PutEmailIdentityMailFromAttributes`, `ses:PutEmailIdentityDkimAttributes`
- `ses:GetAccount`, `ses:ListSuppressedDestinations`, `ses:GetSuppressedDestination`

If you need an action outside this list, stop and report it rather than assuming it will
work — the call will fail with AccessDenied at runtime.

## 3. Domain identity status

| Domain | SES status | MAIL FROM | Notes |
|---|---|---|---|
| `tript.io` | **Verified** — DKIM Successful, MAIL FROM Successful | `mail.tript.io` | live site; Resend still active on `send.tript.io` |
| (domain 2) | not yet verified | `mail.<domain>` | |
| (domain 3) | not yet verified | `mail.<domain>` | |

**Convention: the MAIL FROM subdomain is always `mail.<domain>`.** Hardcode this default
in `scripts/verify-domain.ts` so every domain is set up identically.

DKIM is Easy DKIM, RSA-2048. Behavior on MX failure is **"Use default MAIL FROM domain"** —
keep this setting for all domains (a DNS problem degrades alignment rather than dropping
auth email).

### Do not touch these existing DNS records

`tript.io` currently serves live traffic and live Resend email. The following records are
load-bearing and must not be modified or removed by any script or instruction:

- `send` MX + `send` TXT — Resend's MAIL FROM (Resend runs on SES; same record shape as
  ours, different subdomain). Both coexist deliberately.
- `resend._domainkey` TXT — Resend DKIM
- `smtp._domainkey` TXT + apex MX/SPF — Mailgun, via Squarespace email forwarding
- `_dmarc` TXT — currently `v=DMARC1; p=none;`

`scripts/verify-domain.ts` must only **print** records for a human to add. It must never
attempt to write DNS.

## 4. Sandbox status

The account is **in the SES sandbox** (production access requested; approval pending).

While in sandbox:

- Recipients must be verified identities. A verified **domain** covers every address at
  that domain, so any `@tript.io` address is already a valid recipient.
- Limits: 200 messages / 24h, 1 message/second.

**Build and test against `EMAIL_PROVIDER=console` by default.** Do not require AWS
credentials to run the dev server or the test suite.

### Mailbox simulator — use these in tests

These work in sandbox, need no verification, and do not affect reputation:

```
success@simulator.amazonses.com
bounce@simulator.amazonses.com
complaint@simulator.amazonses.com
suppressionlist@simulator.amazonses.com
```

Wire the bounce/complaint integration tests against these rather than mocking SES events
where practical.

## 5. Pricing plan / account settings already chosen

- **Essentials** plan ($0.16 per 1,000 emails, 0–10M/month). Not Pro, not Enterprise.
- **Virtual Deliverability Manager: on** (dashboards only)
- **Engagement tracking: OFF** — deliberate. It rewrites every link through an AWS
  redirect domain, which is unacceptable on password-reset and verification emails.
  **Do not enable it account-wide.** If per-message tracking is ever needed for
  non-auth mail, do it via a configuration set scoped to those templates only.
- **Optimized shared delivery: on**
- **Auto Validation: OFF** — deliberate. It can silently suppress sends based on a
  validity heuristic; a false positive means a user never receives a password reset with
  no error surfaced. Our own bounce-driven suppression list replaces it.
- **Dedicated IPs: none.** ~$25/mo each and actively harmful at low volume (no reputation,
  never warms up). Shared pool only.
- **SES Tenants: not used.** Enterprise-tier feature. Per-domain reputation already
  isolates the apps.

## 6. Configuration sets — build this in

Create one SES configuration set **per app** (free), and pass its name on every send.
This gives per-app delivery/bounce/complaint metrics and per-app CloudWatch alarms without
SES Tenants.

- Add an optional `configurationSet` field to each entry in the `APPS` config.
- The SES provider passes it as `ConfigurationSetName` when present, omits it when absent.
- Naming convention: the `appId` (e.g. `tript`, `meal-picker`).
- The service must work correctly when the field is absent — the config sets do not exist
  in AWS yet and will be created later.

Do **not** enable engagement/open/click tracking on these configuration sets.

## 7. What is NOT done yet

- Production access approval (pending with AWS)
- Domains 2 and 3 verification
- SNS topic + bounce/complaint subscription (build the webhook per plan §8; the topic gets
  wired once the endpoint is deployed)
- Configuration sets in AWS (build the code path now, create them later)
- CloudWatch alarms on bounce/complaint rate

None of these block development. Build against `console`, then sandbox SES.

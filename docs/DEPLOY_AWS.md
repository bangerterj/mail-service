# Deploying mail-service on AWS

This runs the whole service inside one AWS account: Amazon SES sends the mail, App Runner
hosts the API, an IAM role grants sending permission (no long-lived access keys), and
Secrets Manager holds the API-key config. Bounces come back through SNS.

```
your apps ──► https://mailapi.example.com/api/send ──► App Runner (this container) ──► SES ──► inbox
                                                          ▲
                                     SES bounce/complaint ─┴─ SNS ─► /api/webhooks/ses
```

Expect to spend an afternoon, most of it waiting on DNS and on AWS approving production
access. At low volume the running cost is a few dollars a month — check the App Runner and
SES pricing pages for current figures.

The Vercel setup in the README still works; this is the all-AWS alternative.

---

## What you need

- An AWS account, and the AWS CLI v2 signed in as a user who can administer SES, IAM,
  ECR, App Runner, Secrets Manager and SNS
- A domain whose DNS you can edit, e.g. `example.com`
- Docker, Node.js 22 and pnpm 10
- A local checkout of this repo, with `pnpm install` run once

Throughout, replace `example.com` with your domain, `ACCOUNT_ID` with your 12-digit account
id, and `REGION` with the region you choose in step 1.

---

## 1. Choose a region

Pick one region that offers SES and use it for everything: SES identities, production
access, configuration sets, App Runner and SNS. SES resources are per-region, and a domain
verified in one region cannot send from another.

`us-east-1` is the default the code and scripts assume. If you pick another region, set
`AWS_REGION` everywhere below, including when running the scripts.

## 2. Verify your sending domain in SES

Run this with your own admin credentials (the running service never needs these
permissions):

```bash
pnpm verify-domain example.com
```

It creates the SES identity, sets a custom MAIL FROM subdomain of `mail.example.com`, and
prints the DNS records to add: three DKIM CNAMEs, an MX and an SPF TXT for the MAIL FROM
subdomain, and a starter DMARC record. **It only prints them — it never writes DNS.** Add
them at your DNS provider. If a `_dmarc` record already exists, leave it; two break DMARC.

Then wait for verification:

```bash
pnpm check-domain example.com --watch
```

## 3. Request production access

New SES accounts start in the **sandbox**: 200 messages a day, 1 per second, and only to
verified addresses. Request production access in the SES console under *Account dashboard*.
The README has wording that describes both transactional and notification mail honestly —
use it, and give a realistic volume. Approval usually takes about a day.

You can finish every other step while you wait. To test in the sandbox, send to the
mailbox simulator (`success@simulator.amazonses.com`), which needs no verification.

## 4. Create the IAM role the service runs as

App Runner gives the container credentials from an *instance role*. When
`MAIL_AWS_ACCESS_KEY_ID` and `MAIL_AWS_SECRET_ACCESS_KEY` are unset, the SES client uses
that role automatically — so there are no access keys to leak or rotate.

Trust policy (`trust.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "tasks.apprunner.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Permissions (`mail-service-policy.json`) — sending only, from your domain, plus reading the
two secrets created in step 6:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SendFromOurDomain",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": [
        "arn:aws:ses:REGION:ACCOUNT_ID:identity/example.com",
        "arn:aws:ses:REGION:ACCOUNT_ID:configuration-set/*"
      ]
    },
    {
      "Sid": "ReadOwnSecrets",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:mail-service/*"
    }
  ]
}
```

```bash
aws iam create-role --role-name mail-service-instance \
  --assume-role-policy-document file://trust.json
aws iam put-role-policy --role-name mail-service-instance \
  --policy-name mail-service --policy-document file://mail-service-policy.json
```

While in the sandbox, SES also checks the *recipient* identity. If sends to verified test
addresses fail with AccessDenied, add those identities' ARNs to the first statement, or use
`"Resource": "*"` until production access is granted and then narrow it back.

Add another `identity/…` line for each extra sending domain.

## 5. Optional: Redis for rate limiting and suppression

Rate limiting and the bounce/complaint suppression list use Upstash Redis over its REST API.
Without it the service still sends, logs a warning, and relies on SES's account-level
suppression list as a backstop.

To enable it, create a free Upstash Redis database (any region near yours) and note its REST
URL and token. ElastiCache will not work: the client speaks Upstash's REST API, not the Redis
protocol.

## 6. Create API keys and store the config

Each app that sends mail gets its own API key, and **the key decides the from-address**:

```bash
pnpm generate-key my-app example.com
```

It prints a key and a JSON fragment. Combine the fragments for all your apps into one JSON
object — that is `APPS` (shape documented in the README). Treat it as a secret: it contains
every app's key.

Store it, and a random webhook secret, in Secrets Manager:

```bash
aws secretsmanager create-secret --region REGION \
  --name mail-service/APPS --secret-string file://apps.json
aws secretsmanager create-secret --region REGION \
  --name mail-service/SES_WEBHOOK_SECRET --secret-string "$(openssl rand -hex 32)"
```

If you use Redis, store its token as `mail-service/UPSTASH_REDIS_REST_TOKEN` the same way.
Delete `apps.json` afterwards — the repo's `.gitignore` covers `apps*.json`, but don't rely
on that.

## 7. Build the image and push it to ECR

The image needs no secrets to build.

```bash
aws ecr create-repository --region REGION --repository-name mail-service

aws ecr get-login-password --region REGION \
  | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com

docker build --platform linux/amd64 -t mail-service .
docker tag mail-service ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/mail-service:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/mail-service:latest
```

`--platform linux/amd64` matters on Apple Silicon: App Runner runs x86.

## 8. Create the App Runner service

In the App Runner console, **Create service**:

- **Source:** Container registry → Amazon ECR → the `mail-service:latest` image. Let it
  create an ECR access role. Turn on automatic deployment if you want every push to deploy.
- **Port:** `3000`
- **CPU / memory:** the smallest size (0.25 vCPU, 0.5 GB) is plenty.
- **Environment variables** (plain text):
  - `AWS_REGION` = `REGION`
  - `EMAIL_PROVIDER` = `ses`
  - `UPSTASH_REDIS_REST_URL` = your Upstash URL (if using Redis)
- **Environment variables** (Secrets Manager references), using each secret's full ARN:
  - `APPS` → `mail-service/APPS`
  - `SES_WEBHOOK_SECRET` → `mail-service/SES_WEBHOOK_SECRET`
  - `UPSTASH_REDIS_REST_TOKEN` → `mail-service/UPSTASH_REDIS_REST_TOKEN` (if using Redis)
- **Security → Instance role:** `mail-service-instance`
- **Health check:** HTTP, path `/api/health`

Do **not** set `MAIL_AWS_ACCESS_KEY_ID` or `MAIL_AWS_SECRET_ACCESS_KEY`. Leaving them unset is
what makes the service use the instance role.

When it shows *Running*, open the default `…awsapprunner.com/api/health` URL. It should
report your app count, `ses` as the provider, and whether Redis and the webhook secret are
configured. If the service fails to start, the logs will say why — a bad `APPS` is reported
by name.

## 9. Give it your own domain

In the service's **Custom domains** tab, link `mailapi.example.com`. App Runner shows a CNAME
for it plus certificate-validation records; add them at your DNS provider.

Use a different name from the MAIL FROM subdomain in step 2. `mail.example.com` already
carries an MX and an SPF record, and DNS does not allow a CNAME alongside other records on
the same name — linking the API there would break either sending or the custom domain.

## 10. Handle bounces and complaints

Sending repeatedly to dead addresses is the quickest way to get an SES account suspended.

1. Create an SNS topic, e.g. `mail-service-events`, in `REGION`.
2. In SES, create a configuration set (named after the app, e.g. `my-app`), add an **event
   destination** of type SNS for `Bounce` and `Complaint`, pointing at the topic. Leave open
   and click tracking **off** — it rewrites every link, including password-reset links.
3. Add `"configurationSet": "my-app"` to that app's entry in `APPS` and update the secret.
   Only add it once the set exists: naming a missing set fails every send.
4. Subscribe the topic to your endpoint over HTTPS:

   ```
   https://mailapi.example.com/api/webhooks/ses?secret=<SES_WEBHOOK_SECRET value>
   ```

   The service confirms the subscription automatically. Check it shows **Confirmed** in the
   SNS console — it does nothing until then.

Every incoming message's SNS signature is verified, and the shared secret is required as well.

## 11. Send a test

```bash
curl -s https://mailapi.example.com/api/health

curl -X POST https://mailapi.example.com/api/send \
  -H "authorization: Bearer <an API key from APPS>" \
  -H "content-type: application/json" \
  -d '{"to":"success@simulator.amazonses.com","template":"welcome","data":{"name":"Test"}}'
```

A `202` with `"status":"sent"` means SES accepted it. The template must be in that app's
`templates` allowlist.

---

## Connecting an app

An app needs exactly two settings, and no AWS SDK:

```
MAIL_SERVICE_URL=https://mailapi.example.com
MAIL_API_KEY=<that app's key from APPS>
```

Copy the typed client from `packages/client/src/index.ts` into the app, or call the HTTP API
directly. `MAIL_API_KEY` is server-side only — never expose it to a browser.

Adding a new email is a template in this repo (`docs/ADDING_A_TEMPLATE.md`), added to the
app's allowlist in `APPS`, then a redeploy.

## Day-to-day operations

- **Deploy a change:** rebuild and push the image (step 7). With automatic deployment on,
  App Runner rolls it out.
- **Add an app or rotate a key:** edit the `mail-service/APPS` secret, then trigger a
  deployment so the new value is read.
- **Watch deliverability:** the SES console shows bounce and complaint rates. Keep bounces
  under 5% and complaints under 0.1%, or AWS will review the account. Consider CloudWatch
  alarms on the configuration-set metrics.

## Other AWS hosting options

- **Amplify Hosting** can build the repo straight from GitHub with no Docker. Its
  server-rendered functions do not see console environment variables at runtime unless the
  build writes them to `.env.production`, and it cannot attach an instance role in the same
  way — you would supply `MAIL_AWS_ACCESS_KEY_ID` / `MAIL_AWS_SECRET_ACCESS_KEY` for a
  send-only IAM user instead.
- **ECS on Fargate** runs the same image with a task role in place of the instance role.
  More setup than App Runner (load balancer, networking), more control.
- **Lambda** is possible through an adapter such as OpenNext, but gains little for a service
  this small.

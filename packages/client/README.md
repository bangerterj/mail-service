# @mail-service/client

Typed client for the mail-service transactional email API.

```ts
import { createMailClient, MailError } from "@mail-service/client";

const mail = createMailClient({
  apiKey: process.env.MAIL_API_KEY!,
  baseUrl: process.env.MAIL_SERVICE_URL!,
});

try {
  await mail.send({
    to: user.email,
    template: "password-reset",
    data: { resetUrl },
  });
} catch (err) {
  if (err instanceof MailError && err.isRateLimited) {
    // back off for err.retryAfter seconds
  }
  throw err;
}
```

Template names and their `data` shapes are typed — a wrong or missing field is a
compile error. Defaults: 10s timeout, one retry on network error or 5xx.
Consuming apps need exactly two env vars: `MAIL_API_KEY` and `MAIL_SERVICE_URL`.

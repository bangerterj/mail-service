import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import { config } from "@/lib/config";
import { buildMimeMessage } from "@/lib/mime";
import { logger } from "@/lib/logger";
import { ProviderError, type EmailProvider, type SendParams } from "./types";

// Instantiated once at module scope so warm invocations reuse the connection pool.
const client = new SESv2Client({
  region: config.region,
  ...(config.accessKeyId && config.secretAccessKey
    ? {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }
    : {}),
});

const RETRYABLE_NAMES = new Set([
  "ThrottlingException",
  "TooManyRequestsException",
  "RequestTimeout",
  "TimeoutError",
  "ServiceUnavailable",
  "InternalServiceErrorException",
  "InternalFailure",
]);

function isRetryable(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  if (e?.name && RETRYABLE_NAMES.has(e.name)) return true;
  const status = e?.$metadata?.httpStatusCode;
  return typeof status === "number" && status >= 500;
}

function formatSender(name: string, address: string): string {
  // RFC 5322 display names containing specials must be quoted.
  const escaped = name.replace(/(["\\])/g, "\\$1");
  return `"${escaped}" <${address}>`;
}

export const sesProvider: EmailProvider = {
  name: "ses",
  async send(params: SendParams) {
    // Custom headers require raw MIME; SESv2's simple content shape cannot
    // express them. Notification mail always takes the raw path.
    const content = params.headers
      ? { Raw: { Data: await buildMimeMessage(params) } }
      : {
          Simple: {
            Subject: { Data: params.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: params.html, Charset: "UTF-8" },
              Text: { Data: params.text, Charset: "UTF-8" },
            },
          },
        };

    const input: SendEmailCommandInput = {
      FromEmailAddress: formatSender(params.fromName, params.from),
      Destination: { ToAddresses: params.to },
      ...(params.replyTo ? { ReplyToAddresses: [params.replyTo] } : {}),
      // Omitted entirely when absent — naming a config set that does not exist
      // in AWS fails the send.
      ...(params.configurationSet
        ? { ConfigurationSetName: params.configurationSet }
        : {}),
      Content: content,
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await client.send(new SendEmailCommand(input));
        if (!res.MessageId) {
          throw new ProviderError("SES returned no MessageId", false);
        }
        return { id: res.MessageId };
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        const retryable = isRetryable(err);
        // Retry once on transient errors only; never on validation or
        // suppressed-address rejections.
        if (retryable && attempt === 0) {
          logger.warn("ses transient failure, retrying", {
            error: (err as Error).name,
          });
          continue;
        }
        throw new ProviderError(
          `SES send failed: ${(err as Error).name ?? "unknown"}`,
          retryable,
          err,
        );
      }
    }
    throw new ProviderError("SES send failed after retry", true);
  },
};

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { suppress } from "@/lib/suppression";
import { isValidSigningCertUrl, verifySnsSignature, type SnsMessage } from "@/lib/sns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SesEvent {
  eventType?: string;
  notificationType?: string;
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: Array<{ emailAddress?: string }>;
  };
  complaint?: {
    complaintFeedbackType?: string;
    complainedRecipients?: Array<{ emailAddress?: string }>;
  };
}

function secretOk(provided: string | null): boolean {
  if (!config.webhookSecret) {
    logger.warn("SES_WEBHOOK_SECRET is unset: webhook is unauthenticated");
    return true;
  }
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(config.webhookSecret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!secretOk(req.nextUrl.searchParams.get("secret"))) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  const bodyText = await req.text();
  let msg: SnsMessage;
  try {
    msg = JSON.parse(bodyText) as SnsMessage;
  } catch {
    return NextResponse.json({ error: { code: "validation_error" } }, { status: 400 });
  }

  // Signature verification. Skipped only when SNS sent no cert URL at all
  // (never true for real SNS traffic).
  if (isValidSigningCertUrl(msg.SigningCertURL)) {
    if (!(await verifySnsSignature(msg))) {
      logger.warn("rejected SNS message with invalid signature", {
        messageId: msg.MessageId,
      });
      return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
    }
  } else if (msg.SigningCertURL) {
    logger.warn("rejected SNS message with untrusted SigningCertURL");
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  // The subscription is not active until SubscribeURL is fetched.
  if (msg.Type === "SubscriptionConfirmation") {
    if (!msg.SubscribeURL) {
      return NextResponse.json({ error: { code: "validation_error" } }, { status: 400 });
    }
    const res = await fetch(msg.SubscribeURL);
    logger.info("confirmed SNS subscription", {
      topicArn: msg.TopicArn,
      ok: res.ok,
      status: res.status,
    });
    return NextResponse.json({ status: "subscription_confirmed" });
  }

  if (msg.Type !== "Notification") {
    logger.info("ignoring SNS message", { type: msg.Type });
    return NextResponse.json({ status: "ignored" });
  }

  let event: SesEvent;
  try {
    event = JSON.parse(msg.Message) as SesEvent;
  } catch {
    return NextResponse.json({ error: { code: "validation_error" } }, { status: 400 });
  }

  const kind = event.eventType ?? event.notificationType;
  const suppressed: string[] = [];

  if (kind === "Bounce" && event.bounce) {
    // Only permanent bounces suppress; transient/undetermined ones may recover.
    if (event.bounce.bounceType === "Permanent") {
      for (const r of event.bounce.bouncedRecipients ?? []) {
        if (r.emailAddress) {
          // The address is dead: block every category.
          await suppress(
            r.emailAddress,
            `hard-bounce:${event.bounce.bounceSubType}`,
            "all",
          );
          suppressed.push(r.emailAddress);
        }
      }
    } else {
      logger.info("ignoring soft bounce", { bounceType: event.bounce.bounceType });
    }
  } else if (kind === "Complaint" && event.complaint) {
    // Every complaint suppresses, but notification mail only — blocking a
    // password reset because someone spam-reported a mention email would lock
    // them out of their own account.
    for (const r of event.complaint.complainedRecipients ?? []) {
      if (r.emailAddress) {
        await suppress(r.emailAddress, "complaint", "notification");
        suppressed.push(r.emailAddress);
      }
    }
  } else {
    logger.info("ignoring SES event", { kind });
  }

  return NextResponse.json({ status: "ok", suppressed: suppressed.length });
}

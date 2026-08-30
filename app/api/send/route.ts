import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { templates, isTemplateName, type TemplateName } from "@/emails";
import { authenticate, extractBearerToken } from "@/lib/auth";
import { DEFAULT_RATE_LIMIT } from "@/lib/config";
import { errorResponse } from "@/lib/errors";
import { logger, recipientDomains } from "@/lib/logger";
import { getProvider, ProviderError } from "@/lib/providers";
import { checkRateLimit } from "@/lib/ratelimit";
import { renderTemplate } from "@/lib/render";
import { filterSuppressed } from "@/lib/suppression";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 10;

const bodySchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(MAX_RECIPIENTS)]),
  template: z.string().min(1),
  data: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(1).max(255).optional(),
  /** Required for `notification` templates, rejected for `transactional` ones. */
  unsubscribeUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  // 1. Auth
  const app = authenticate(extractBearerToken(req.headers.get("authorization")));
  if (!app) {
    return errorResponse("unauthorized", "Missing or invalid API key.");
  }

  // 2. Validate
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse("validation_error", "Request body must be valid JSON.");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse("validation_error", "Invalid request body.", {
      details: parsed.error.flatten().fieldErrors,
    });
  }
  const body = parsed.data;
  const to = Array.isArray(body.to) ? body.to : [body.to];

  // 3. Authorize template
  if (!isTemplateName(body.template)) {
    return errorResponse(
      "template_not_allowed",
      `Unknown template "${body.template}".`,
    );
  }
  const template: TemplateName = body.template;
  if (!app.templates.includes(template)) {
    return errorResponse(
      "template_not_allowed",
      `Template "${template}" is not enabled for this app.`,
    );
  }

  const category = templates[template].category;

  // 3a. Notification mail must carry an opt-out. Enforced here so a
  // notification email with no unsubscribe path cannot ship by accident.
  if (category === "notification" && !body.unsubscribeUrl) {
    return errorResponse(
      "validation_error",
      `Template "${template}" is a notification and requires "unsubscribeUrl".`,
      { details: { unsubscribeUrl: ["Required for notification templates."] } },
    );
  }
  // Transactional mail must not carry one — no unsubscribing from a password reset.
  const unsubscribeUrl = category === "notification" ? body.unsubscribeUrl : undefined;

  // Template-specific payload validation.
  const dataParsed = templates[template].schema.safeParse(body.data);
  if (!dataParsed.success) {
    return errorResponse("validation_error", `Invalid data for template "${template}".`, {
      details: dataParsed.error.flatten().fieldErrors,
    });
  }

  // 4. Rate limit
  const rl = await checkRateLimit(app.appId, app.rateLimit ?? DEFAULT_RATE_LIMIT);
  if (!rl.success) {
    logger.warn("rate limited", { appId: app.appId, template });
    return errorResponse("rate_limited", "Rate limit exceeded.", {
      headers: { "Retry-After": String(rl.retryAfter) },
    });
  }

  // 5. Suppression — category-aware: a complaint blocks notifications but not
  // a password reset.
  const { allowed, suppressed } = await filterSuppressed(to, category);
  if (allowed.length === 0) {
    logger.info("send suppressed", {
      appId: app.appId,
      template,
      category,
      recipientDomains: recipientDomains(to),
      latencyMs: Date.now() - startedAt,
      outcome: "suppressed",
    });
    // Not an error: surfacing it as one makes callers retry into a wall.
    return NextResponse.json({ status: "suppressed", suppressed: suppressed.length }, {
      status: 200,
    });
  }

  try {
    // 6. Render
    const rendered = await renderTemplate(
      template,
      dataParsed.data as Record<string, unknown>,
      app.fromName,
      unsubscribeUrl,
    );

    // One-click unsubscribe headers, notification mail only.
    const headers = unsubscribeUrl
      ? {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined;

    // 7. Send — from/fromName/replyTo come from config, never the request body.
    const provider = getProvider();
    const { id } = await provider.send({
      to: allowed,
      from: app.from,
      fromName: app.fromName,
      replyTo: app.replyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      ...(headers ? { headers } : {}),
      ...(app.configurationSet ? { configurationSet: app.configurationSet } : {}),
    });

    logger.info("send ok", {
      appId: app.appId,
      template,
      category,
      recipientDomains: recipientDomains(allowed),
      suppressedCount: suppressed.length,
      latencyMs: Date.now() - startedAt,
      outcome: "sent",
      provider: provider.name,
      messageId: id,
      idempotencyKey: body.idempotencyKey,
    });

    // 8. Respond
    return NextResponse.json({ id, status: "sent" }, { status: 202 });
  } catch (err) {
    const isProvider = err instanceof ProviderError;
    logger.error("send failed", {
      appId: app.appId,
      template,
      category,
      recipientDomains: recipientDomains(allowed),
      latencyMs: Date.now() - startedAt,
      outcome: "error",
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    // Never leak the AWS error to the caller.
    return isProvider
      ? errorResponse("provider_error", "Email provider rejected the request.")
      : errorResponse("internal_error", "Unexpected error sending email.");
  }
}

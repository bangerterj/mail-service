/**
 * Zero-dependency typed client for the mail-service API.
 * Uses global fetch — no AWS SDK reaches the consuming app's bundle.
 */

export interface TemplateData {
  "password-reset": { resetUrl: string; name?: string };
  "verify-email": { verifyUrl: string; name?: string };
  welcome: { name?: string; actionUrl?: string };
  mention: {
    actorName: string;
    contextTitle: string;
    excerpt?: string;
    url: string;
  };
  "activity-digest": {
    period: string;
    items: Array<{ title: string; detail?: string; url?: string }>;
    actionUrl?: string;
  };
  "magic-sign-in": { signInUrl: string; name?: string; expiresIn?: string };
  "household-invite": {
    inviterName: string;
    householdName: string;
    acceptUrl: string;
    /** The consent panel: what accepting would start sharing. Required. */
    shares: string[];
    recipientName?: string;
    expiresIn?: string;
  };
  "group-invite": {
    inviterName: string;
    groupName: string;
    acceptUrl: string;
    recipientName?: string;
    expiresIn?: string;
  };

  /**
   * FamilyPantree's own designs, served as the design handoff's HTML verbatim.
   * Every field is required — a missing one is a 400, not a half-rendered email.
   */
  "familypantree-password-reset": {
    resetUrl: string;
    loginUrl: string;
    siteDomain: string;
    postalAddress: string;
    preferencesUrl: string;
    reportUrl: string;
  };
  "familypantree-magic-sign-in": {
    signInUrl: string;
    siteDomain: string;
    postalAddress: string;
    preferencesUrl: string;
  };
  "familypantree-household-invite": {
    inviterFirstName: string;
    inviterEmail: string;
    householdName: string;
    /** Display phrases, not numerals: "9 people", "1 person". */
    memberCount: string;
    storeCount: string;
    stapleCount: string;
    joinUrl: string;
    inviteCode: string;
    expiresInDays: string;
    postalAddress: string;
    reportUrl: string;
  };
  "familypantree-group-invite": {
    inviterFirstName: string;
    groupName: string;
    memberCount: string;
    recipeCount: string;
    joinUrl: string;
    groupCode: string;
    postalAddress: string;
    reportUrl: string;
  };
}

export type TemplateName = keyof TemplateData;

/**
 * Notification templates are caused by someone else's action and legally and
 * practically need an opt-out, so `unsubscribeUrl` is required for them at the
 * type level — the server also enforces it with a 400.
 */
export type NotificationTemplate =
  | "mention"
  | "activity-digest"
  | "household-invite"
  | "group-invite";
export type TransactionalTemplate = Exclude<TemplateName, NotificationTemplate>;

export type SendRequest<T extends TemplateName> = {
  to: string | string[];
  template: T;
  data: TemplateData[T];
  idempotencyKey?: string;
} & (T extends NotificationTemplate
  ? { unsubscribeUrl: string }
  : { unsubscribeUrl?: never });

export interface SendResult {
  id?: string;
  status: "sent" | "suppressed";
  suppressed?: number;
}

export type MailErrorCode =
  | "validation_error"
  | "unauthorized"
  | "template_not_allowed"
  | "rate_limited"
  | "provider_error"
  | "internal_error"
  | "network_error"
  | "timeout";

export class MailError extends Error {
  constructor(
    readonly code: MailErrorCode,
    message: string,
    readonly status?: number,
    readonly details?: unknown,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "MailError";
  }

  get isRateLimited(): boolean {
    return this.code === "rate_limited";
  }

  get isInvalidRequest(): boolean {
    return this.code === "validation_error" || this.code === "template_not_allowed";
  }

  get isRetryable(): boolean {
    return (
      this.code === "network_error" ||
      this.code === "timeout" ||
      this.code === "provider_error" ||
      this.code === "internal_error"
    );
  }
}

export interface MailClientOptions {
  apiKey: string;
  baseUrl: string;
  /** Request timeout in ms. Default 10000. */
  timeoutMs?: number;
  /** Retries after the first attempt, on network error or 5xx. Default 1. */
  retries?: number;
  fetch?: typeof globalThis.fetch;
}

export interface MailClient {
  send<T extends TemplateName>(req: SendRequest<T>): Promise<SendResult>;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export function createMailClient(options: MailClientOptions): MailClient {
  const {
    apiKey,
    baseUrl,
    timeoutMs = 10_000,
    retries = 1,
    fetch: fetchImpl = globalThis.fetch,
  } = options;

  if (!apiKey) throw new Error("createMailClient: apiKey is required");
  if (!baseUrl) throw new Error("createMailClient: baseUrl is required");

  const url = `${baseUrl.replace(/\/+$/, "")}/api/send`;

  async function attempt<T extends TemplateName>(
    req: SendRequest<T>,
  ): Promise<SendResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
    } catch (err) {
      const timedOut = (err as Error).name === "AbortError";
      throw new MailError(
        timedOut ? "timeout" : "network_error",
        timedOut ? `Request timed out after ${timeoutMs}ms` : (err as Error).message,
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) return (await res.json()) as SendResult;

    let body: ApiErrorBody = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* non-JSON error body */
    }
    const retryAfterHeader = res.headers.get("retry-after");
    throw new MailError(
      (body.error?.code as MailErrorCode) ?? "internal_error",
      body.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      body.error?.details,
      retryAfterHeader ? Number(retryAfterHeader) : undefined,
    );
  }

  return {
    async send<T extends TemplateName>(req: SendRequest<T>): Promise<SendResult> {
      let lastError: MailError | undefined;
      for (let i = 0; i <= retries; i++) {
        try {
          return await attempt(req);
        } catch (err) {
          const mailError =
            err instanceof MailError
              ? err
              : new MailError("network_error", (err as Error).message);
          // Retry network errors and 5xx only — never a 4xx.
          const retryable =
            mailError.code === "network_error" ||
            mailError.code === "timeout" ||
            (mailError.status !== undefined && mailError.status >= 500);
          if (!retryable || i === retries) throw mailError;
          lastError = mailError;
        }
      }
      throw lastError ?? new MailError("internal_error", "send failed");
    },
  };
}

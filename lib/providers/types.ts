export interface SendParams {
  to: string[];
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Extra RFC 5322 headers. Notification sends carry List-Unsubscribe and
   * List-Unsubscribe-Post here; transactional sends carry neither.
   */
  headers?: Record<string, string>;
  /** SES configuration set. Omitted entirely when the app config has none. */
  configurationSet?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(params: SendParams): Promise<{ id: string }>;
}

/** Provider failures the route turns into a 502 without leaking detail. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

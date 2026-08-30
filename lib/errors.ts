import { NextResponse } from "next/server";

export type ErrorCode =
  | "validation_error"
  | "unauthorized"
  | "template_not_allowed"
  | "rate_limited"
  | "provider_error"
  | "internal_error";

const STATUS: Record<ErrorCode, number> = {
  validation_error: 400,
  unauthorized: 401,
  template_not_allowed: 403,
  rate_limited: 429,
  provider_error: 502,
  internal_error: 500,
};

export function errorResponse(
  code: ErrorCode,
  message: string,
  extra?: { details?: unknown; headers?: Record<string, string> },
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(extra?.details === undefined ? {} : { details: extra.details }),
      },
    },
    { status: STATUS[code], headers: extra?.headers },
  );
}

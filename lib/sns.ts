import { createVerify } from "node:crypto";
import { logger } from "@/lib/logger";

export interface SnsMessage {
  Type: "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
  SignatureVersion?: string;
  Signature?: string;
  SigningCertURL?: string;
}

const SIGNING_FIELDS: Record<string, string[]> = {
  Notification: ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"],
  SubscriptionConfirmation: [
    "Message",
    "MessageId",
    "SubscribeURL",
    "Timestamp",
    "Token",
    "TopicArn",
    "Type",
  ],
  UnsubscribeConfirmation: [
    "Message",
    "MessageId",
    "SubscribeURL",
    "Timestamp",
    "Token",
    "TopicArn",
    "Type",
  ],
};

/** Only AWS-owned hosts may serve the signing certificate. */
export function isValidSigningCertUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(parsed.hostname) &&
      parsed.pathname.endsWith(".pem")
    );
  } catch {
    return false;
  }
}

function canonicalString(msg: SnsMessage): string {
  const fields = SIGNING_FIELDS[msg.Type];
  if (!fields) throw new Error(`unknown SNS message type: ${msg.Type}`);
  let out = "";
  for (const field of fields) {
    const value = (msg as unknown as Record<string, unknown>)[field];
    if (value === undefined || value === null) continue;
    out += `${field}\n${value}\n`;
  }
  return out;
}

const certCache = new Map<string, string>();

async function fetchCert(url: string): Promise<string> {
  const cached = certCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch SNS signing cert: ${res.status}`);
  const pem = await res.text();
  certCache.set(url, pem);
  return pem;
}

/**
 * Verifies the SNS message signature against the AWS-hosted signing certificate.
 * Returns false rather than throwing so the caller can reject uniformly.
 */
export async function verifySnsSignature(msg: SnsMessage): Promise<boolean> {
  try {
    if (!msg.Signature || !isValidSigningCertUrl(msg.SigningCertURL)) return false;
    const algorithm = msg.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";
    const pem = await fetchCert(msg.SigningCertURL!);
    const verifier = createVerify(algorithm);
    verifier.update(canonicalString(msg), "utf8");
    return verifier.verify(pem, msg.Signature, "base64");
  } catch (err) {
    logger.warn("SNS signature verification errored", {
      error: (err as Error).message,
    });
    return false;
  }
}

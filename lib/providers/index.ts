import { providerName } from "@/lib/config";
import { consoleProvider } from "./console";
import type { EmailProvider } from "./types";

let cached: EmailProvider | null = null;

export function getProvider(): EmailProvider {
  if (cached) return cached;
  if (providerName === "console") {
    cached = consoleProvider;
  } else {
    // Required lazily so `EMAIL_PROVIDER=console` never loads the AWS SDK.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = (require("./ses") as typeof import("./ses")).sesProvider;
  }
  return cached;
}

export type { EmailProvider, SendParams } from "./types";
export { ProviderError } from "./types";

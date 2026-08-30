import { randomUUID } from "node:crypto";
import { logger } from "@/lib/logger";
import type { EmailProvider, SendParams } from "./types";

/** Dev/test provider — logs the rendered mail and returns a fake id. */
export const consoleProvider: EmailProvider = {
  name: "console",
  async send(params: SendParams) {
    const id = `console_${randomUUID()}`;
    logger.info("console provider send", {
      id,
      to: params.to,
      from: `${params.fromName} <${params.from}>`,
      replyTo: params.replyTo,
      subject: params.subject,
      headers: params.headers,
      configurationSet: params.configurationSet,
    });
    console.log(`\n--- text/plain ---\n${params.text}\n--- text/html ---\n${params.html}\n`);
    return { id };
  },
};

import MailComposer from "nodemailer/lib/mail-composer";
import type { SendParams } from "@/lib/providers/types";

/**
 * Builds a multipart/alternative MIME message. Custom headers (List-Unsubscribe)
 * are not expressible through SESv2's simple content shape, so anything with
 * headers has to go out as raw MIME.
 *
 * MailComposer is used only to *build* the message — never to send it.
 */
export async function buildMimeMessage(params: SendParams): Promise<Buffer> {
  const composer = new MailComposer({
    from: { name: params.fromName, address: params.from },
    to: params.to,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    subject: params.subject,
    text: params.text,
    html: params.html,
    ...(params.headers ? { headers: params.headers } : {}),
  });

  return await composer.compile().build();
}

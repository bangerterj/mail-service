import { render } from "@react-email/components";
import { templates, type TemplateName } from "@/emails";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Renders both an HTML and a plaintext part. Always send both — HTML-only mail
 * is a strong spam signal.
 *
 * `unsubscribeUrl` is passed through to the shared layout, which renders the
 * visible opt-out link for notification templates.
 */
export async function renderTemplate(
  name: TemplateName,
  data: Record<string, unknown>,
  appName: string,
  unsubscribeUrl?: string,
): Promise<RenderedEmail> {
  const template = templates[name];
  const props = { ...data, appName, unsubscribeUrl } as never;
  const html = await render(template.component(props));
  const text = template.text(props);
  return {
    subject: template.subject(data as never, appName),
    html,
    text,
  };
}

import { render } from "@react-email/components";
import { isTokenTemplate, templates, type TemplateName } from "@/emails";
import {
  render as renderTokens,
  renderSubject,
  type TokenValues,
  type TokenSchema,
} from "@/lib/token-render";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Renders both an HTML and a plaintext part. Always send both — HTML-only mail
 * is a strong spam signal.
 *
 * Two template kinds:
 *  - `react`  — a React Email component plus a text renderer.
 *  - `tokens` — the design handoff's HTML verbatim, with escaped `{token}`
 *               substitution. See lib/token-render.
 *
 * `unsubscribeUrl` reaches a React template as a prop and a token template
 * through its declared `unsubscribeToken`, so in both cases the visible opt-out
 * and the List-Unsubscribe header come from one value.
 */
export async function renderTemplate(
  name: TemplateName,
  data: Record<string, unknown>,
  appName: string,
  unsubscribeUrl?: string,
): Promise<RenderedEmail> {
  const template = templates[name];

  if (isTokenTemplate(template)) {
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      values[key] = typeof value === "string" ? value : String(value);
    }
    if (template.unsubscribeToken && unsubscribeUrl) {
      values[template.unsubscribeToken] = unsubscribeUrl;
    }

    const schema = template.tokens as TokenSchema;
    const typed = values as TokenValues<typeof schema>;
    return {
      subject: renderSubject(template.subjectTemplate, schema, typed),
      html: renderTokens(template.html, schema, typed, "html"),
      text: renderTokens(template.textTemplate, schema, typed, "text"),
    };
  }

  const props = { ...data, appName, unsubscribeUrl } as never;
  const html = await render(template.component(props));
  const text = template.text(props);
  return {
    subject: template.subject(data as never, appName),
    html,
    text,
  };
}

/**
 * Token substitution for the four email templates.
 *
 * The templates in `./templates` are the design handoff's HTML, verbatim, with
 * the variable parts written as `{token}`. That is deliberate: a port that
 * rewrote the markup into components would be impossible to diff against the
 * file a designer signed off, and email HTML is the one place where "I moved
 * this into a helper" reliably breaks a client nobody tests in.
 *
 * Substitution is not string interpolation, for two reasons:
 *
 *  1. **Every value is attacker-supplied.** A household name, a group name and
 *     an inviter's name all arrive from a text field. `<img src=x onerror=…>`
 *     in a household name is inert in most mail clients and live in a few, and
 *     either way it is not what "The Abernathys" should render as. So each
 *     token declares what KIND of value it is and is escaped for the context
 *     it lands in.
 *  2. **A missing token must be loud.** An email that ships the literal text
 *     `{joinUrl}` to a user is a broken email, and the moment to find out is
 *     the render, not the inbox. `render` throws on any surviving placeholder.
 */

export type TokenKind =
  /** Plain copy, escaped for element content. */
  | "text"
  /** A whole URL, used as an `href`. Scheme-checked. */
  | "url"
  /** A value pasted INTO a URL (a code, a token). Percent-encoded. */
  | "urlPart";

export type TokenSchema = Readonly<Record<string, TokenKind>>;

export type TokenValues<S extends TokenSchema> = Readonly<
  Record<keyof S & string, string>
>;

/** Anything that still looks like a placeholder after substitution. */
const LEFTOVER = /\{[a-zA-Z][a-zA-Z0-9]*\}/;

/**
 * Schemes an email link may use.
 *
 * `mailto:` earns its place because "report this invite" has no route to point
 * at on a deployment with no support desk — see `mail/config.ts`. Everything
 * else, `javascript:` and `data:` included, is refused rather than escaped:
 * there is no legitimate reason for one to reach a template, so silently
 * neutering it would hide the bug that put it there.
 */
const ALLOWED_SCHEMES = ["http://", "https://", "mailto:"];

/**
 * Render a template.
 *
 * `mode` decides the escaping, not the content: the HTML body and its
 * plain-text alternative carry the same tokens and the same facts, and only
 * differ in what a `&` means.
 */
export function render<S extends TokenSchema>(
  template: string,
  schema: S,
  values: TokenValues<S>,
  mode: "html" | "text" = "html",
): string {
  let out = template;

  for (const [name, kind] of Object.entries(schema)) {
    const raw = values[name as keyof S & string];
    if (typeof raw !== "string") {
      throw new Error(`email template: no value supplied for {${name}}`);
    }
    // Split/join rather than a RegExp: a token name is a literal, and building
    // a pattern from one invites an escaping bug in the escaping code.
    out = out.split(`{${name}}`).join(encode(raw, kind, mode));
  }

  const leftover = out.match(LEFTOVER);
  if (leftover) {
    throw new Error(
      `email template: {${leftover[0].slice(1, -1)}} was never substituted`,
    );
  }

  return out;
}

/**
 * A subject line.
 *
 * Same tokens, text escaping, and newlines stripped — a display name
 * containing a CRLF is how a subject becomes an extra header.
 */
export function renderSubject<S extends TokenSchema>(
  template: string,
  schema: S,
  values: TokenValues<S>,
): string {
  return render(template, schema, values, "text").replace(/\s+/g, " ").trim();
}

/**
 * Does this template use every token it declares?
 *
 * A declared-but-absent token means the port dropped a fact the design stated
 * — the counts, the expiry, the inviter's address. Checked by the tests rather
 * than at render time, because it is a defect in the template, not in the data
 * a running app happens to hold.
 */
export function missingTokens(template: string, schema: TokenSchema): string[] {
  return Object.keys(schema).filter((name) => !template.includes(`{${name}}`));
}

/* ------------------------------------------------------------------ */

function encode(raw: string, kind: TokenKind, mode: "html" | "text"): string {
  switch (kind) {
    case "url":
      return mode === "html" ? escapeHtml(checkUrl(raw)) : checkUrl(raw);
    case "urlPart":
      return encodeURIComponent(raw);
    case "text": {
      // Collapse newlines first in BOTH modes. A household name is a
      // single-line value everywhere it is entered, and one containing a line
      // break would restructure the plain-text body it lands in.
      const flat = raw.replace(/\s+/g, " ").trim();
      return mode === "html" ? escapeHtml(flat) : flat;
    }
  }
}

function checkUrl(raw: string): string {
  const url = raw.trim();
  if (!ALLOWED_SCHEMES.some((scheme) => url.toLowerCase().startsWith(scheme))) {
    throw new Error(`email template: refusing to link to ${url}`);
  }
  return url;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

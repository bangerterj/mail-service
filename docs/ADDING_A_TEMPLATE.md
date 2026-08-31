# Adding a template

For an agent working in the `mail-service` repo. You are adding one email.

Apps do not send HTML — they name a template and pass typed data. So a new email
means a new template here, then one line added to that app's allowlist.

**Your app can look however you want.** Templates are not required to share a
visual style. If your app's mail has its own shell, colors, wordmark and voice,
build that — do not try to fit into the generic layout. `emails/components/layout.tsx`
is a convenience for apps that do not care, not a house style.

Name app-specific templates after the app: `tript-signin`, `banter-signin`.
Unprefixed names (`welcome`, `password-reset`) are the generic ones any app may use.

---

## What you must not change

These are enforced by the send pipeline, not by your template. Do not try to work
around them; they are the reason apps can hand this service their auth mail.

1. **The from-address comes from config, keyed to the API key.** Nothing in a
   template or request body can change it.
2. **Every send has a plaintext part.** You must export a `text` renderer. It is
   not derived from your HTML — you write it. HTML-only mail is a spam signal.
3. **Notification templates carry an opt-out.** If your `category` is
   `notification`, the route rejects any send without `unsubscribeUrl`, sets
   `List-Unsubscribe` headers, and your template must render a visible opt-out
   link. Transactional templates get none of this.
4. **Category is a real decision, not a label.** `transactional` = the recipient's
   own action caused it (sign-in, password reset). `notification` = someone else's
   action caused it (invites, mentions, digests). Get this right: a complaint
   suppresses notification mail but must never block a password reset.

---

## Steps

### 1. Write the component

`emails/<name>.tsx`, exporting a component and a `text` function. Both receive
`appName` (from config) and, for notifications, `unsubscribeUrl`.

```tsx
export interface TriptSignInProps {
  appName: string;
  code: string;
  magicLink: string;
}

export function TriptSignIn({ code, magicLink }: TriptSignInProps) { /* ... */ }

export function triptSignInText({ code, magicLink }: TriptSignInProps) {
  return [`Your code is ${code}. It works for 15 minutes.`, "", magicLink].join("\n");
}
```

### 2. Register it

In `emails/index.ts`:

```ts
"tript-signin": define({
  category: "transactional",
  schema: z.object({ code: z.string().length(6), magicLink: z.string().url() }),
  subject: () => "Your TRIPT sign-in code",
  component: (props) => React.createElement(TriptSignIn, props),
  text: triptSignInText,
}),
```

The schema validates the caller's `data`. Be strict — a missing field should be a
400, not a broken email in someone's inbox.

### 3. Mirror the type in the client

`packages/client/src/index.ts`: add the entry to `TemplateData`, and to
`NotificationTemplate` if it is one. This is what makes a wrong field a compile
error in the consuming app.

### 4. Add it to the app's allowlist

In the `APPS` env var, add the name to that app's `templates` array. Without this
the send is a 403.

### 5. Test it

`tests/templates.test.ts`. Assert the things that would be invisible in review:
that required data is rejected, and that anything load-bearing reaches **both**
the HTML and the text part.

```bash
pnpm test
pnpm email:dev     # preview in a browser
```

---

## Email HTML is not web HTML

If you are hand-writing markup for a branded template, the constraints are real:

- **Tables for layout.** Outlook ignores flex and grid.
- **Inline styles.** `<style>` blocks are stripped by several clients; keep only
  media queries and dark-mode rules there, and treat them as progressive
  enhancement.
- **Bulletproof buttons.** A styled `<a>` with padding, not a `<button>`. Also
  print the URL as visible text — some clients strip the button.
- **No pure white** if the design has a warm shell; it inverts badly in dark mode.
- **Dark-mode rules must target anchors too** (`.foot, .foot a`). An inline color
  on an `<a>` beats a class rule on its parent.
- **Images need absolute HTTPS URLs and `alt` text.** A relative path does not
  exist for a recipient. Assume images are blocked: the email must still work.
- **No web fonts for anything load-bearing.** Give every face a real fallback.
- **Check contrast.** Fine print at 2.5:1 fails; keep body text at AA.

React Email handles most of this if you use its components. If you drop to raw
markup for fidelity, you own these.

---

## Things worth deciding before you build

- **Does the recipient have an account?** Invites go to strangers. That changes
  the copy and makes the opt-out matter more.
- **Is any of it a consent record?** If the email is what a recipient reads before
  agreeing to share data, the disclosure belongs in the schema as required data,
  not as prose someone might drop. See `household-invite`.
- **What happens with fields absent?** Prefer a template that degrades to omitting
  a block over one that prints "0 spots left" or "Untitled".

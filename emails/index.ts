import * as React from "react";
import { z } from "zod";
import { ActivityDigestEmail, activityDigestText } from "./activity-digest";
import { MentionEmail, mentionText } from "./mention";
import { PasswordResetEmail, passwordResetText } from "./password-reset";
import { VerifyEmail, verifyEmailText } from "./verify-email";
import { WelcomeEmail, welcomeText } from "./welcome";

/**
 * `transactional` — the recipient's own action caused it. No unsubscribe;
 * suppressing these would break account access.
 * `notification` — someone else's action caused it. Requires an opt-out: the
 * send route rejects these without an `unsubscribeUrl`, and the outgoing
 * message carries List-Unsubscribe headers.
 */
export type TemplateCategory = "transactional" | "notification";

/**
 * A template owns its own `data` schema, subject line, React component, and
 * plaintext renderer. `appName` and `unsubscribeUrl` are injected by the route
 * (from app config and the request respectively), so they are not part of the
 * caller-facing `data` schema.
 */
export interface TemplateDefinition<S extends z.ZodTypeAny> {
  category: TemplateCategory;
  schema: S;
  subject: (data: z.infer<S>, appName: string) => string;
  component: (
    props: z.infer<S> & { appName: string; unsubscribeUrl?: string },
  ) => React.ReactElement;
  text: (props: z.infer<S> & { appName: string; unsubscribeUrl?: string }) => string;
}

function define<S extends z.ZodTypeAny>(def: TemplateDefinition<S>) {
  return def;
}

export const templates = {
  "password-reset": define({
    category: "transactional",
    schema: z.object({
      resetUrl: z.string().url(),
      name: z.string().max(100).optional(),
    }),
    subject: () => "Reset your password",
    component: (props) => React.createElement(PasswordResetEmail, props),
    text: passwordResetText,
  }),
  "verify-email": define({
    category: "transactional",
    schema: z.object({
      verifyUrl: z.string().url(),
      name: z.string().max(100).optional(),
    }),
    subject: (_d, appName) => `Confirm your email for ${appName}`,
    component: (props) => React.createElement(VerifyEmail, props),
    text: verifyEmailText,
  }),
  welcome: define({
    category: "transactional",
    schema: z.object({
      name: z.string().max(100).optional(),
      actionUrl: z.string().url().optional(),
    }),
    subject: (_d, appName) => `Welcome to ${appName}`,
    component: (props) => React.createElement(WelcomeEmail, props),
    text: welcomeText,
  }),
  mention: define({
    category: "notification",
    schema: z.object({
      actorName: z.string().min(1).max(100),
      contextTitle: z.string().min(1).max(200),
      excerpt: z.string().max(500).optional(),
      url: z.string().url(),
    }),
    subject: (d) => `${d.actorName} mentioned you in ${d.contextTitle}`,
    component: (props) => React.createElement(MentionEmail, props),
    text: mentionText,
  }),
  "activity-digest": define({
    category: "notification",
    schema: z.object({
      period: z.string().min(1).max(50),
      items: z
        .array(
          z.object({
            title: z.string().min(1).max(200),
            detail: z.string().max(500).optional(),
            url: z.string().url().optional(),
          }),
        )
        .min(1)
        .max(50),
      actionUrl: z.string().url().optional(),
    }),
    subject: (d, appName) => `Your ${d.period} activity on ${appName}`,
    component: (props) => React.createElement(ActivityDigestEmail, props),
    text: activityDigestText,
  }),
} as const;

export type TemplateName = keyof typeof templates;

export const templateNames = Object.keys(templates) as [TemplateName, ...TemplateName[]];

export function isTemplateName(value: string): value is TemplateName {
  return Object.prototype.hasOwnProperty.call(templates, value);
}

export function categoryOf(name: TemplateName): TemplateCategory {
  return templates[name].category;
}

export function isNotification(name: TemplateName): boolean {
  return templates[name].category === "notification";
}

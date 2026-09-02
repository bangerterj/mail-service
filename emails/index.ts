import * as React from "react";
import { z } from "zod";
import { ActivityDigestEmail, activityDigestText } from "./activity-digest";
import { GroupInviteEmail, groupInviteText } from "./group-invite";
import { HouseholdInviteEmail, householdInviteText } from "./household-invite";
import { MagicSignInEmail, magicSignInText } from "./magic-sign-in";
import { MentionEmail, mentionText } from "./mention";
import { PasswordResetEmail, passwordResetText } from "./password-reset";
import { VerifyEmail, verifyEmailText } from "./verify-email";
import { WelcomeEmail, welcomeText } from "./welcome";
import type { TokenSchema } from "@/lib/token-render";
import {
  HOUSEHOLD_INVITE_HTML,
  HOUSEHOLD_INVITE_SUBJECT,
  HOUSEHOLD_INVITE_TEXT,
  HOUSEHOLD_INVITE_TOKENS,
} from "./familypantree/household-invite";
import {
  GROUP_INVITE_HTML,
  GROUP_INVITE_SUBJECT,
  GROUP_INVITE_TEXT,
  GROUP_INVITE_TOKENS,
} from "./familypantree/group-invite";
import {
  MAGIC_SIGN_IN_HTML,
  MAGIC_SIGN_IN_SUBJECT,
  MAGIC_SIGN_IN_TEXT,
  MAGIC_SIGN_IN_TOKENS,
} from "./familypantree/magic-sign-in";
import {
  PASSWORD_RESET_HTML as FP_PASSWORD_RESET_HTML,
  PASSWORD_RESET_SUBJECT as FP_PASSWORD_RESET_SUBJECT,
  PASSWORD_RESET_TEXT as FP_PASSWORD_RESET_TEXT,
  PASSWORD_RESET_TOKENS as FP_PASSWORD_RESET_TOKENS,
} from "./familypantree/password-reset";
import {
  BANTER_SIGNIN_HTML,
  BANTER_SIGNIN_SUBJECT,
  BANTER_SIGNIN_TEXT,
  BANTER_SIGNIN_TOKENS,
} from "./banter/signin";
import { BanterRecapEmail, banterRecapText } from "./banter/recap";
import {
  FinancialHealthDailyEmail,
  financialHealthDailySubject,
  financialHealthDailyText,
} from "./financial-health/daily";

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
  kind?: "react";
  category: TemplateCategory;
  schema: S;
  subject: (data: z.infer<S>, appName: string) => string;
  component: (
    props: z.infer<S> & { appName: string; unsubscribeUrl?: string },
  ) => React.ReactElement;
  text: (props: z.infer<S> & { appName: string; unsubscribeUrl?: string }) => string;
}

/**
 * A template whose markup is the design handoff's HTML verbatim, with `{token}`
 * standing in for each fact. Values are escaped per token kind rather than
 * interpolated, and an unsubstituted placeholder throws — see lib/token-render.
 *
 * This exists so an app's own hardened email HTML can be served unchanged. A
 * port that rewrote it into components could not be diffed against the file a
 * designer signed off, which is where email markup quietly breaks.
 */
export interface TokenTemplateDefinition<S extends z.ZodTypeAny> {
  kind: "tokens";
  category: TemplateCategory;
  schema: S;
  tokens: TokenSchema;
  subjectTemplate: string;
  html: string;
  textTemplate: string;
  /**
   * Token that receives the request's `unsubscribeUrl`, so the visible
   * preferences link and the List-Unsubscribe header cannot disagree. Notification
   * templates set this instead of taking the URL as caller data.
   */
  unsubscribeToken?: string;
}

export type AnyTemplateDefinition<S extends z.ZodTypeAny> =
  | TemplateDefinition<S>
  | TokenTemplateDefinition<S>;

export function isTokenTemplate(
  def: AnyTemplateDefinition<z.ZodTypeAny>,
): def is TokenTemplateDefinition<z.ZodTypeAny> {
  return def.kind === "tokens";
}

function define<S extends z.ZodTypeAny>(def: TemplateDefinition<S>) {
  return def;
}

function defineTokens<S extends z.ZodTypeAny>(
  def: Omit<TokenTemplateDefinition<S>, "kind">,
): TokenTemplateDefinition<S> {
  return { ...def, kind: "tokens" };
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
  "magic-sign-in": define({
    category: "transactional",
    schema: z.object({
      signInUrl: z.string().url(),
      name: z.string().max(100).optional(),
      expiresIn: z.string().max(50).optional(),
    }),
    subject: (_d, appName) => `Sign in to ${appName}`,
    component: (props) => React.createElement(MagicSignInEmail, props),
    text: magicSignInText,
  }),
  "household-invite": define({
    // Notification: someone else's action caused it, so it carries an opt-out.
    // Invite spam with no way to stop it is a fast route to complaints.
    category: "notification",
    schema: z.object({
      inviterName: z.string().min(1).max(100),
      householdName: z.string().min(1).max(100),
      acceptUrl: z.string().url(),
      // The consent panel. Required — a household invite that does not say what
      // it grants is the failure this template exists to prevent.
      shares: z.array(z.string().min(1).max(120)).min(1).max(20),
      recipientName: z.string().max(100).optional(),
      expiresIn: z.string().max(50).optional(),
    }),
    subject: (d) => `${d.inviterName} invited you to join ${d.householdName}`,
    component: (props) => React.createElement(HouseholdInviteEmail, props),
    text: householdInviteText,
  }),
  "group-invite": define({
    category: "notification",
    schema: z.object({
      inviterName: z.string().min(1).max(100),
      groupName: z.string().min(1).max(100),
      acceptUrl: z.string().url(),
      recipientName: z.string().max(100).optional(),
      expiresIn: z.string().max(50).optional(),
    }),
    subject: (d) => `${d.inviterName} invited you to ${d.groupName}`,
    component: (props) => React.createElement(GroupInviteEmail, props),
    text: groupInviteText,
  }),
  "familypantree-household-invite": defineTokens({
    category: "notification",
    tokens: HOUSEHOLD_INVITE_TOKENS,
    subjectTemplate: HOUSEHOLD_INVITE_SUBJECT,
    html: HOUSEHOLD_INVITE_HTML,
    textTemplate: HOUSEHOLD_INVITE_TEXT,
    // The visible "Manage email preferences" link is the request's
    // unsubscribeUrl, so it always matches the List-Unsubscribe header.
    unsubscribeToken: "preferencesUrl",
    schema: z.object({
      inviterFirstName: z.string().min(1).max(100),
      inviterEmail: z.string().email(),
      householdName: z.string().min(1).max(100),
      // Display phrases, not numerals: "9 people", "1 person". The app formats
      // them because "1 people share this one" is the commonest household there is.
      memberCount: z.string().min(1).max(40),
      storeCount: z.string().min(1).max(40),
      stapleCount: z.string().min(1).max(40),
      joinUrl: z.string().url(),
      inviteCode: z.string().min(1).max(64),
      expiresInDays: z.string().min(1).max(40),
      postalAddress: z.string().min(1).max(200),
      reportUrl: z.string().min(1).max(300),
    }),
  }),
  "familypantree-group-invite": defineTokens({
    category: "notification",
    tokens: GROUP_INVITE_TOKENS,
    subjectTemplate: GROUP_INVITE_SUBJECT,
    html: GROUP_INVITE_HTML,
    textTemplate: GROUP_INVITE_TEXT,
    unsubscribeToken: "preferencesUrl",
    schema: z.object({
      inviterFirstName: z.string().min(1).max(100),
      groupName: z.string().min(1).max(100),
      memberCount: z.string().min(1).max(40),
      recipeCount: z.string().min(1).max(40),
      joinUrl: z.string().url(),
      groupCode: z.string().min(1).max(64),
      postalAddress: z.string().min(1).max(200),
      reportUrl: z.string().min(1).max(300),
    }),
  }),
  // Transactional: no unsubscribeToken, so preferencesUrl is caller-supplied.
  // There is no opting out of a password reset.
  "familypantree-magic-sign-in": defineTokens({
    category: "transactional",
    tokens: MAGIC_SIGN_IN_TOKENS,
    subjectTemplate: MAGIC_SIGN_IN_SUBJECT,
    html: MAGIC_SIGN_IN_HTML,
    textTemplate: MAGIC_SIGN_IN_TEXT,
    schema: z.object({
      signInUrl: z.string().url(),
      siteDomain: z.string().min(1).max(100),
      postalAddress: z.string().min(1).max(200),
      preferencesUrl: z.string().url(),
    }),
  }),
  "familypantree-password-reset": defineTokens({
    category: "transactional",
    tokens: FP_PASSWORD_RESET_TOKENS,
    subjectTemplate: FP_PASSWORD_RESET_SUBJECT,
    html: FP_PASSWORD_RESET_HTML,
    textTemplate: FP_PASSWORD_RESET_TEXT,
    schema: z.object({
      resetUrl: z.string().url(),
      loginUrl: z.string().url(),
      siteDomain: z.string().min(1).max(100),
      postalAddress: z.string().min(1).max(200),
      preferencesUrl: z.string().url(),
      reportUrl: z.string().min(1).max(300),
    }),
  }),
  "banter-signin": defineTokens({
    category: "transactional",
    tokens: BANTER_SIGNIN_TOKENS,
    subjectTemplate: BANTER_SIGNIN_SUBJECT,
    html: BANTER_SIGNIN_HTML,
    textTemplate: BANTER_SIGNIN_TEXT,
    schema: z.object({
      identifier: z.string().email(),
      signInUrl: z.string().url(),
    }),
  }),
  "banter-recap": define({
    // A scheduled digest of other people's activity — the recipient did not ask
    // for this one, so it requires an opt-out.
    category: "notification",
    schema: z.object({
      items: z.array(z.string().min(1).max(300)).min(1).max(50),
      viewUrl: z.string().url(),
    }),
    subject: () => "Your Evening Recap",
    component: (props) => React.createElement(BanterRecapEmail, props),
    text: banterRecapText,
  }),
  "financial-health-daily": define({
    // Money Mountain's 4:30am budget report — a scheduled digest of the
    // household's own bank activity, so it carries an opt-out. The subject is
    // computed from the data because it is meant to tell the whole story
    // unopened: "Tue Sep 15 · $2,457 left · on pace". Markup follows the
    // Claude Design handoff; this schema is the stable contract beneath it.
    category: "notification",
    schema: z.object({
      reportDate: z.string().min(1).max(40),
      dayOfMonth: z.number().int().min(1).max(31),
      daysInMonth: z.number().int().min(28).max(31),
      budget: z.number().finite(),
      spent: z.number().finite(),
      baselinePerDay: z.number().finite(),
      yesterday: z
        .array(
          z.object({
            merchant: z.string().min(1).max(120),
            amount: z.number().finite(),
            category: z.string().max(80),
            pending: z.boolean().optional(),
            needed: z.boolean().optional(),
            uncategorized: z.boolean().optional(),
            fixUrl: z.string().url().optional(),
          }),
        )
        .max(100),
      categories: z
        .array(
          z.object({
            name: z.string().min(1).max(80),
            spent: z.number().finite(),
            typical: z.number().finite(),
            needed: z.boolean().optional(),
          }),
        )
        .max(40),
      upcoming: z
        .array(
          z.object({
            label: z.string().min(1).max(80),
            total: z.number().finite(),
            setAside: z.number().finite(),
            due: z.string().min(1).max(60),
            accrual: z.string().max(60).optional(),
          }),
        )
        .max(20),
      committedEvents: z.array(z.object({ text: z.string().min(1).max(200) })).max(10).optional(),
      savedLastMonth: z
        .object({
          month: z.string().min(1).max(20),
          lines: z.array(z.object({ label: z.string().min(1).max(60), amount: z.number().finite() })).max(10),
          total: z.number().finite(),
          projection: z.string().max(400).optional(),
          progress: z.string().max(120).optional(),
        })
        .optional(),
      subscriptions: z.object({
        count: z.number().int().min(0),
        monthlyTotal: z.number().finite(),
        chargedCount: z.number().int().min(0),
        chargedTotal: z.number().finite(),
        charged: z
          .array(
            z.object({
              merchant: z.string().min(1).max(80),
              amount: z.number().finite(),
              date: z.string().max(20).optional(),
              priceFrom: z.number().finite().optional(),
            }),
          )
          .max(50),
        stillToCharge: z.object({ names: z.array(z.string().min(1).max(60)).max(50), total: z.number().finite() }).optional(),
      }),
      dailyLine: z.string().max(200).optional(),
      committed: z.object({
        total: z.number().finite(),
        lines: z.array(z.object({ label: z.string().min(1).max(60), amount: z.number().finite() })).max(20),
      }),
      syncedAt: z.string().min(1).max(40),
      appUrl: z.string().url(),
    }),
    subject: (d, appName) => financialHealthDailySubject({ ...d, appName }),
    component: (props) => React.createElement(FinancialHealthDailyEmail, props),
    text: financialHealthDailyText,
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

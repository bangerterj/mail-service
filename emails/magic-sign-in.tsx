import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface MagicSignInEmailProps {
  appName: string;
  signInUrl: string;
  name?: string;
  expiresIn?: string;
}

/**
 * Distinct from verify-email: this URL signs the recipient in, it does not
 * merely prove they own the address. Transactional — the recipient asked for
 * it seconds ago, and it carries no unsubscribe.
 */
export function MagicSignInEmail({
  appName,
  signInUrl,
  name,
  expiresIn,
}: MagicSignInEmailProps) {
  return (
    <Layout appName={appName} preview={`Your ${appName} sign-in link`}>
      <Text style={heading}>Sign in to {appName}</Text>
      <Text style={paragraph}>
        {name ? `Hi ${name}, ` : ""}use the button below to sign in. It works once
        {expiresIn ? ` and expires ${expiresIn}` : ""}.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={signInUrl}>Sign in</Button>
      </Section>
      <UrlFallback url={signInUrl} />
      <Text style={warning}>
        Anyone with this link can sign in as you — do not forward it. If you did not
        request it, ignore this email; nobody gains access unless the link is opened.
      </Text>
    </Layout>
  );
}

export function magicSignInText({
  appName,
  signInUrl,
  name,
  expiresIn,
}: MagicSignInEmailProps) {
  return [
    `${name ? `Hi ${name},` : "Hi,"}`,
    "",
    `Use this link to sign in to ${appName}. It works once${
      expiresIn ? ` and expires ${expiresIn}` : ""
    }:`,
    signInUrl,
    "",
    "Anyone with this link can sign in as you — do not forward it.",
    "If you did not request it, ignore this email.",
    "",
    `— ${appName}`,
  ].join("\n");
}

const warning: React.CSSProperties = {
  color: "#666666",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "16px 0 0",
};

MagicSignInEmail.PreviewProps = {
  appName: "Family Pantree",
  signInUrl: "https://familypantree.com/auth/magic?token=preview",
  name: "Sam",
  expiresIn: "in 15 minutes",
} satisfies MagicSignInEmailProps;

export default MagicSignInEmail;

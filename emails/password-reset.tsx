import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface PasswordResetEmailProps {
  appName: string;
  resetUrl: string;
  name?: string;
}

export function PasswordResetEmail({ appName, resetUrl, name }: PasswordResetEmailProps) {
  return (
    <Layout appName={appName} preview={`Reset your ${appName} password`}>
      <Text style={heading}>Reset your password</Text>
      <Text style={paragraph}>
        {name ? `Hi ${name}, ` : ""}we received a request to reset the password for your{" "}
        {appName} account. Click the button below to choose a new one. This link expires
        shortly.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={resetUrl}>Reset password</Button>
      </Section>
      <UrlFallback url={resetUrl} />
      <Text style={paragraph}>
        If you did not request a password reset, no action is needed.
      </Text>
    </Layout>
  );
}

export function passwordResetText({ appName, resetUrl, name }: PasswordResetEmailProps) {
  return [
    `${name ? `Hi ${name},` : "Hi,"}`,
    "",
    `We received a request to reset the password for your ${appName} account.`,
    "Open this link to choose a new password:",
    resetUrl,
    "",
    "If you did not request a password reset, no action is needed.",
    "",
    `— ${appName}`,
  ].join("\n");
}

PasswordResetEmail.PreviewProps = {
  appName: "Example App",
  resetUrl: "https://example.com/reset?token=preview",
  name: "Jeff",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;

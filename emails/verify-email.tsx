import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface VerifyEmailProps {
  appName: string;
  verifyUrl: string;
  name?: string;
}

export function VerifyEmail({ appName, verifyUrl, name }: VerifyEmailProps) {
  return (
    <Layout appName={appName} preview={`Confirm your email for ${appName}`}>
      <Text style={heading}>Confirm your email address</Text>
      <Text style={paragraph}>
        {name ? `Hi ${name}, ` : ""}confirm this email address to finish setting up your{" "}
        {appName} account.
      </Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={verifyUrl}>Confirm email address</Button>
      </Section>
      <UrlFallback url={verifyUrl} />
      <Text style={paragraph}>
        If you did not create a {appName} account, you can ignore this email.
      </Text>
    </Layout>
  );
}

export function verifyEmailText({ appName, verifyUrl, name }: VerifyEmailProps) {
  return [
    `${name ? `Hi ${name},` : "Hi,"}`,
    "",
    `Confirm this email address to finish setting up your ${appName} account:`,
    verifyUrl,
    "",
    `If you did not create a ${appName} account, you can ignore this email.`,
    "",
    `— ${appName}`,
  ].join("\n");
}

VerifyEmail.PreviewProps = {
  appName: "Example App",
  verifyUrl: "https://example.com/verify?token=preview",
  name: "Jeff",
} satisfies VerifyEmailProps;

export default VerifyEmail;

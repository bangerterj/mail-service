import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface WelcomeEmailProps {
  appName: string;
  name?: string;
  actionUrl?: string;
}

export function WelcomeEmail({ appName, name, actionUrl }: WelcomeEmailProps) {
  return (
    <Layout appName={appName} preview={`Welcome to ${appName}`}>
      <Text style={heading}>Welcome to {appName}</Text>
      <Text style={paragraph}>
        {name ? `Hi ${name}, y` : "Y"}our account is ready. Thanks for signing up.
      </Text>
      {actionUrl ? (
        <>
          <Section style={{ margin: "24px 0" }}>
            <Button href={actionUrl}>Get started</Button>
          </Section>
          <UrlFallback url={actionUrl} />
        </>
      ) : null}
    </Layout>
  );
}

export function welcomeText({ appName, name, actionUrl }: WelcomeEmailProps) {
  return [
    `${name ? `Hi ${name},` : "Hi,"}`,
    "",
    `Welcome to ${appName} — your account is ready. Thanks for signing up.`,
    ...(actionUrl ? ["", "Get started:", actionUrl] : []),
    "",
    `— ${appName}`,
  ].join("\n");
}

WelcomeEmail.PreviewProps = {
  appName: "Example App",
  name: "Jeff",
  actionUrl: "https://example.com/dashboard",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;

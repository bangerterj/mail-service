import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface LayoutProps {
  appName: string;
  preview: string;
  children: React.ReactNode;
  /**
   * Present only for `notification` templates. The layout renders the visible
   * opt-out link itself so no individual template can forget it.
   */
  unsubscribeUrl?: string;
}

export function Layout({ appName, preview, children, unsubscribeUrl }: LayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>{appName}</Text>
          <Section>{children}</Section>
          <Hr style={hr} />
          <Text style={footer}>
            Sent by {appName}. If you did not expect this email you can safely ignore it.
          </Text>
          {unsubscribeUrl ? (
            <Text style={footer}>
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe from these notifications
              </Link>
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

export function Button({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={button}>
      {children}
    </Link>
  );
}

/** Shown as visible text too — some clients strip styled buttons. */
export function UrlFallback({ url }: { url: string }) {
  return (
    <Text style={muted}>
      If the button does not work, copy and paste this link into your browser:
      <br />
      <Link href={url} style={link}>
        {url}
      </Link>
    </Text>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "24px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e6e6e6",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px",
};

const brand: React.CSSProperties = {
  color: "#111111",
  fontSize: "18px",
  fontWeight: 700,
  margin: "0 0 24px",
};

export const heading: React.CSSProperties = {
  color: "#111111",
  fontSize: "22px",
  fontWeight: 600,
  margin: "0 0 16px",
};

export const paragraph: React.CSSProperties = {
  color: "#333333",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const button: React.CSSProperties = {
  backgroundColor: "#111111",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 20px",
  textDecoration: "none",
};

const link: React.CSSProperties = { color: "#0b5fff", wordBreak: "break-all" };

const muted: React.CSSProperties = {
  color: "#666666",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "16px 0 0",
};

const footerLink: React.CSSProperties = {
  color: "#888888",
  textDecoration: "underline",
};

const hr: React.CSSProperties = { borderColor: "#e6e6e6", margin: "24px 0" };

const footer: React.CSSProperties = {
  color: "#888888",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};

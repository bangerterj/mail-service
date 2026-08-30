import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface MentionEmailProps {
  appName: string;
  actorName: string;
  contextTitle: string;
  excerpt?: string;
  url: string;
  /** Required for notification templates; the layout renders the opt-out link. */
  unsubscribeUrl?: string;
}

export function MentionEmail({
  appName,
  actorName,
  contextTitle,
  excerpt,
  url,
  unsubscribeUrl,
}: MentionEmailProps) {
  return (
    <Layout
      appName={appName}
      preview={`${actorName} mentioned you in ${contextTitle}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={heading}>
        {actorName} mentioned you in {contextTitle}
      </Text>
      {excerpt ? <Text style={quote}>{excerpt}</Text> : null}
      <Section style={{ margin: "24px 0" }}>
        <Button href={url}>View it in {appName}</Button>
      </Section>
      <UrlFallback url={url} />
    </Layout>
  );
}

export function mentionText({
  appName,
  actorName,
  contextTitle,
  excerpt,
  url,
  unsubscribeUrl,
}: MentionEmailProps) {
  return [
    `${actorName} mentioned you in ${contextTitle}.`,
    ...(excerpt ? ["", `"${excerpt}"`] : []),
    "",
    "View it here:",
    url,
    "",
    `— ${appName}`,
    ...(unsubscribeUrl
      ? ["", `Unsubscribe from these notifications: ${unsubscribeUrl}`]
      : []),
  ].join("\n");
}

const quote: React.CSSProperties = {
  ...paragraph,
  borderLeft: "3px solid #e6e6e6",
  color: "#555555",
  fontStyle: "italic",
  margin: "0 0 16px",
  padding: "4px 0 4px 12px",
};

MentionEmail.PreviewProps = {
  appName: "Example App",
  actorName: "Jeff",
  contextTitle: "Q3 planning",
  excerpt: "I think @you should own the rollout plan.",
  url: "https://example.com/threads/1#comment-2",
  unsubscribeUrl: "https://example.com/settings/notifications",
} satisfies MentionEmailProps;

export default MentionEmail;

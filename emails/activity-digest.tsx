import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface ActivityDigestItem {
  title: string;
  detail?: string;
  url?: string;
}

export interface ActivityDigestEmailProps {
  appName: string;
  period: string;
  items: ActivityDigestItem[];
  actionUrl?: string;
  /** Required for notification templates; the layout renders the opt-out link. */
  unsubscribeUrl?: string;
}

export function ActivityDigestEmail({
  appName,
  period,
  items,
  actionUrl,
  unsubscribeUrl,
}: ActivityDigestEmailProps) {
  return (
    <Layout
      appName={appName}
      preview={`Your ${period} activity on ${appName}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={heading}>Your {period} activity</Text>
      <Text style={paragraph}>Here is what happened on {appName} while you were away.</Text>
      <Section>
        {items.map((item, i) => (
          <Text key={i} style={itemStyle}>
            <strong>{item.title}</strong>
            {item.detail ? (
              <>
                <br />
                {item.detail}
              </>
            ) : null}
            {item.url ? (
              <>
                <br />
                {item.url}
              </>
            ) : null}
          </Text>
        ))}
      </Section>
      {actionUrl ? (
        <>
          <Section style={{ margin: "24px 0" }}>
            <Button href={actionUrl}>Open {appName}</Button>
          </Section>
          <UrlFallback url={actionUrl} />
        </>
      ) : null}
    </Layout>
  );
}

export function activityDigestText({
  appName,
  period,
  items,
  actionUrl,
  unsubscribeUrl,
}: ActivityDigestEmailProps) {
  return [
    `Your ${period} activity on ${appName}:`,
    "",
    ...items.flatMap((item) =>
      [
        `* ${item.title}`,
        ...(item.detail ? [`  ${item.detail}`] : []),
        ...(item.url ? [`  ${item.url}`] : []),
      ].filter(Boolean),
    ),
    ...(actionUrl ? ["", `Open ${appName}: ${actionUrl}`] : []),
    "",
    `— ${appName}`,
    ...(unsubscribeUrl
      ? ["", `Unsubscribe from these notifications: ${unsubscribeUrl}`]
      : []),
  ].join("\n");
}

const itemStyle: React.CSSProperties = {
  ...paragraph,
  borderBottom: "1px solid #f0f0f0",
  margin: "0 0 12px",
  paddingBottom: "12px",
};

ActivityDigestEmail.PreviewProps = {
  appName: "Example App",
  period: "weekly",
  items: [
    { title: "3 new comments", detail: "On Q3 planning", url: "https://example.com/t/1" },
    { title: "Jeff mentioned you", detail: "In the rollout thread" },
  ],
  actionUrl: "https://example.com/dashboard",
  unsubscribeUrl: "https://example.com/settings/notifications",
} satisfies ActivityDigestEmailProps;

export default ActivityDigestEmail;

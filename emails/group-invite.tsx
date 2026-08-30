import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface GroupInviteEmailProps {
  appName: string;
  inviterName: string;
  groupName: string;
  acceptUrl: string;
  recipientName?: string;
  expiresIn?: string;
  unsubscribeUrl?: string;
}

/**
 * Deliberately NOT the household invite. A group grants recipe visibility only,
 * and this email says so in as many words — a recipient must never be led to
 * think a group share carries the household's pantry, cart or lists.
 */
export function GroupInviteEmail({
  appName,
  inviterName,
  groupName,
  acceptUrl,
  recipientName,
  expiresIn,
  unsubscribeUrl,
}: GroupInviteEmailProps) {
  return (
    <Layout
      appName={appName}
      preview={`${inviterName} invited you to the ${groupName} group`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={heading}>
        {inviterName} invited you to {groupName}
      </Text>
      <Text style={paragraph}>
        {recipientName ? `Hi ${recipientName}, ` : ""}
        {inviterName} would like you to join the <strong>{groupName}</strong> group on{" "}
        {appName}.
      </Text>

      <Section style={scopePanel}>
        <Text style={scopeText}>
          A group shares <strong>recipes only</strong>. It does not share your pantry,
          shopping cart, stores, staples or shopping lists — those stay private to your
          household.
        </Text>
      </Section>

      <Section style={{ margin: "24px 0" }}>
        <Button href={acceptUrl}>View invitation</Button>
      </Section>
      <UrlFallback url={acceptUrl} />

      {expiresIn ? <Text style={paragraph}>This invitation expires {expiresIn}.</Text> : null}
      <Text style={paragraph}>
        If you were not expecting this, you can ignore it — nothing is shared unless you
        accept.
      </Text>
    </Layout>
  );
}

export function groupInviteText({
  appName,
  inviterName,
  groupName,
  acceptUrl,
  recipientName,
  expiresIn,
  unsubscribeUrl,
}: GroupInviteEmailProps) {
  return [
    `${recipientName ? `Hi ${recipientName},` : "Hi,"}`,
    "",
    `${inviterName} would like you to join the ${groupName} group on ${appName}.`,
    "",
    "A group shares RECIPES ONLY. It does not share your pantry, shopping cart,",
    "stores, staples or shopping lists — those stay private to your household.",
    "",
    "View the invitation:",
    acceptUrl,
    ...(expiresIn ? ["", `This invitation expires ${expiresIn}.`] : []),
    "",
    "If you were not expecting this you can ignore it — nothing is shared unless you accept.",
    "",
    `— ${appName}`,
    ...(unsubscribeUrl ? ["", `Stop receiving invitations: ${unsubscribeUrl}`] : []),
  ].join("\n");
}

const scopePanel: React.CSSProperties = {
  borderLeft: "3px solid #d0d0d0",
  margin: "20px 0",
  padding: "2px 0 2px 14px",
};

const scopeText: React.CSSProperties = {
  color: "#555555",
  fontSize: "14px",
  lineHeight: "22px",
  margin: 0,
};

GroupInviteEmail.PreviewProps = {
  appName: "Family Pantree",
  inviterName: "Jeff",
  groupName: "Sunday Dinner Crew",
  acceptUrl: "https://familypantree.com/invite/group/preview",
  recipientName: "Sam",
  expiresIn: "in 7 days",
  unsubscribeUrl: "https://familypantree.com/invites/opt-out?token=preview",
} satisfies GroupInviteEmailProps;

export default GroupInviteEmail;

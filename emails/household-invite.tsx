import { Section, Text } from "@react-email/components";
import * as React from "react";
import { Button, Layout, UrlFallback, heading, paragraph } from "./components/layout";

export interface HouseholdInviteEmailProps {
  appName: string;
  inviterName: string;
  householdName: string;
  acceptUrl: string;
  /**
   * What the recipient would start sharing by accepting. This panel is the
   * consent record — it is required, and the caller supplies it because only
   * the app knows what a household actually grants.
   */
  shares: string[];
  recipientName?: string;
  expiresIn?: string;
  unsubscribeUrl?: string;
}

export function HouseholdInviteEmail({
  appName,
  inviterName,
  householdName,
  acceptUrl,
  shares,
  recipientName,
  expiresIn,
  unsubscribeUrl,
}: HouseholdInviteEmailProps) {
  return (
    <Layout
      appName={appName}
      preview={`${inviterName} invited you to the ${householdName} household`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={heading}>
        {inviterName} invited you to join {householdName}
      </Text>
      <Text style={paragraph}>
        {recipientName ? `Hi ${recipientName}, ` : ""}
        {inviterName} would like you to join the <strong>{householdName}</strong> household
        on {appName}.
      </Text>

      <Section style={consentPanel}>
        <Text style={consentHeading}>What you would start sharing</Text>
        {shares.map((item, i) => (
          <Text key={i} style={consentItem}>
            • {item}
          </Text>
        ))}
        <Text style={consentNote}>
          Joining a household is a two-way share: everyone in {householdName} can see and
          change these, and you can see and change theirs. You can leave the household at
          any time.
        </Text>
      </Section>

      <Section style={{ margin: "24px 0" }}>
        <Button href={acceptUrl}>Review and accept invitation</Button>
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

export function householdInviteText({
  appName,
  inviterName,
  householdName,
  acceptUrl,
  shares,
  recipientName,
  expiresIn,
  unsubscribeUrl,
}: HouseholdInviteEmailProps) {
  return [
    `${recipientName ? `Hi ${recipientName},` : "Hi,"}`,
    "",
    `${inviterName} would like you to join the ${householdName} household on ${appName}.`,
    "",
    "WHAT YOU WOULD START SHARING",
    ...shares.map((item) => `  * ${item}`),
    "",
    `Joining a household is a two-way share: everyone in ${householdName} can see and`,
    "change these, and you can see and change theirs. You can leave at any time.",
    "",
    "Review and accept:",
    acceptUrl,
    ...(expiresIn ? ["", `This invitation expires ${expiresIn}.`] : []),
    "",
    "If you were not expecting this you can ignore it — nothing is shared unless you accept.",
    "",
    `— ${appName}`,
    ...(unsubscribeUrl ? ["", `Stop receiving invitations: ${unsubscribeUrl}`] : []),
  ].join("\n");
}

const consentPanel: React.CSSProperties = {
  backgroundColor: "#f7f7f7",
  border: "1px solid #e6e6e6",
  borderRadius: "6px",
  margin: "24px 0",
  padding: "16px 20px",
};

const consentHeading: React.CSSProperties = {
  color: "#111111",
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.02em",
  margin: "0 0 12px",
  textTransform: "uppercase",
};

const consentItem: React.CSSProperties = {
  color: "#333333",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0 0 6px",
};

const consentNote: React.CSSProperties = {
  color: "#666666",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "12px 0 0",
};

HouseholdInviteEmail.PreviewProps = {
  appName: "Family Pantree",
  inviterName: "Jeff",
  householdName: "The Bangerters",
  acceptUrl: "https://familypantree.com/invite/household/preview",
  shares: [
    "Pantry inventory",
    "Shopping cart",
    "Saved stores",
    "Staples list",
    "Every shopping list",
  ],
  recipientName: "Sam",
  expiresIn: "in 7 days",
  unsubscribeUrl: "https://familypantree.com/invites/opt-out?token=preview",
} satisfies HouseholdInviteEmailProps;

export default HouseholdInviteEmail;

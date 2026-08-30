import { describe, expect, it, vi } from "vitest";
import "./setup-env";

/**
 * Captures the SendEmailCommand input the SES provider builds, without any
 * network call, so the AWS-facing shape is asserted directly.
 */
const captured: Record<string, unknown>[] = [];

vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: class {
    async send(command: { input: Record<string, unknown> }) {
      captured.push(command.input);
      return { MessageId: "ses-message-id" };
    }
  },
  SendEmailCommand: class {
    constructor(readonly input: Record<string, unknown>) {}
  },
}));

const { sesProvider } = await import("@/lib/providers/ses");

const base = {
  to: ["user@example.com"],
  from: "noreply@alpha.test",
  fromName: "Alpha App",
  subject: "Reset your password",
  html: "<p>hi</p>",
  text: "hi",
};

describe("SES SendEmailCommand input", () => {
  it("uses Simple content and no ConfigurationSetName for plain transactional mail", async () => {
    captured.length = 0;
    const res = await sesProvider.send(base);
    expect(res.id).toBe("ses-message-id");
    const input = captured[0];
    expect(input.Content).toHaveProperty("Simple");
    expect(input.Content).not.toHaveProperty("Raw");
    expect(input.ConfigurationSetName).toBeUndefined();
    expect("ConfigurationSetName" in input).toBe(false);
    expect(input.FromEmailAddress).toBe('"Alpha App" <noreply@alpha.test>');
  });

  it("switches to Raw MIME content when headers are present", async () => {
    captured.length = 0;
    await sesProvider.send({
      ...base,
      headers: {
        "List-Unsubscribe": "<https://alpha.test/unsub>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    const input = captured[0];
    expect(input.Content).toHaveProperty("Raw");
    expect(input.Content).not.toHaveProperty("Simple");
    const raw = (input.Content as { Raw: { Data: Buffer } }).Raw.Data.toString("utf8");
    expect(raw).toContain("List-Unsubscribe: <https://alpha.test/unsub>");
  });

  it("sets ConfigurationSetName only when the app config supplies one", async () => {
    captured.length = 0;
    await sesProvider.send({ ...base, configurationSet: "tript" });
    expect(captured[0].ConfigurationSetName).toBe("tript");
  });
});

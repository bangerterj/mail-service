import { describe, expect, it } from "vitest";
import { isValidSigningCertUrl } from "@/lib/sns";

describe("isValidSigningCertUrl", () => {
  it("accepts a genuine AWS SNS signing cert URL", () => {
    expect(
      isValidSigningCertUrl(
        "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem",
      ),
    ).toBe(true);
  });

  it("rejects non-AWS hosts, http, and non-pem paths", () => {
    expect(isValidSigningCertUrl("https://evil.test/cert.pem")).toBe(false);
    expect(
      isValidSigningCertUrl("http://sns.us-east-1.amazonaws.com/cert.pem"),
    ).toBe(false);
    expect(
      isValidSigningCertUrl("https://sns.us-east-1.amazonaws.com.evil.test/cert.pem"),
    ).toBe(false);
    expect(isValidSigningCertUrl("https://sns.us-east-1.amazonaws.com/cert.txt")).toBe(
      false,
    );
    expect(isValidSigningCertUrl(undefined)).toBe(false);
    expect(isValidSigningCertUrl("not a url")).toBe(false);
  });
});

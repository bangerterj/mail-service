import { describe, expect, it } from "vitest";
import { buildMimeMessage } from "@/lib/mime";

const base = {
  to: ["user@example.com"],
  from: "noreply@alpha.test",
  fromName: "Alpha App",
  subject: "Jeff mentioned you in Q3 planning",
  html: "<p>hello</p>",
  text: "hello",
};

describe("buildMimeMessage", () => {
  it("emits a multipart/alternative message with both parts", async () => {
    const mime = (await buildMimeMessage(base)).toString("utf8");
    expect(mime).toContain("multipart/alternative");
    expect(mime).toContain("text/plain");
    expect(mime).toContain("text/html");
    expect(mime).toContain("Subject: Jeff mentioned you in Q3 planning");
  });

  it("includes the List-Unsubscribe headers when supplied", async () => {
    const mime = (
      await buildMimeMessage({
        ...base,
        headers: {
          "List-Unsubscribe": "<https://alpha.test/unsub>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      })
    ).toString("utf8");
    expect(mime).toContain("List-Unsubscribe: <https://alpha.test/unsub>");
    expect(mime).toContain("List-Unsubscribe-Post: List-Unsubscribe=One-Click");
  });

  it("omits List-Unsubscribe entirely for transactional mail", async () => {
    const mime = (await buildMimeMessage(base)).toString("utf8");
    expect(mime).not.toContain("List-Unsubscribe");
  });

  it("sets the display name and reply-to", async () => {
    const mime = (
      await buildMimeMessage({ ...base, replyTo: "support@alpha.test" })
    ).toString("utf8");
    expect(mime).toContain("Alpha App");
    expect(mime).toContain("support@alpha.test");
  });
});

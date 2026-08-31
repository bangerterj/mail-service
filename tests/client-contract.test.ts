import { describe, expect, it } from "vitest";
import "./setup-env";
import { templates, templateNames, type TemplateName } from "@/emails";
import { NOTIFICATION_TEMPLATES } from "../packages/client/src/index";

/**
 * The client is vendored into consuming apps, so a mismatch between its idea of
 * a template's category and the server's is invisible until a real send 400s.
 * This has happened once: the familypantree invites were notifications on the
 * server and transactional in the client, making `unsubscribeUrl` a compile
 * error to pass and a 400 to omit.
 */
describe("client/server template contract", () => {
  const serverNotifications = templateNames
    .filter((name) => templates[name].category === "notification")
    .sort();

  it("client NOTIFICATION_TEMPLATES matches the server registry exactly", () => {
    expect([...NOTIFICATION_TEMPLATES].sort()).toEqual(serverNotifications);
  });

  it("every client notification template exists on the server", () => {
    for (const name of NOTIFICATION_TEMPLATES) {
      expect(templateNames).toContain(name as TemplateName);
    }
  });
});

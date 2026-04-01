import { describe, expect, it } from "vitest";
import {
  buildIntakeReminderEmail,
  buildPreviewReadyEmail,
  buildWelcomeEmail
} from "../src/lib/templates.js";

describe("Noovi email templates", () => {
  it("builds the welcome email", () => {
    const email = buildWelcomeEmail({
      firstName: "Gavin",
      intakeUrl: "https://noovi.com.au",
      fromName: "Noovi"
    });

    expect(email.subject).toBe("Thanks for your enquiry");
    expect(email.emailType).toBe("welcome");
    expect(email.text).toContain("https://noovi.com.au");
  });

  it("builds the intake reminder email", () => {
    const email = buildIntakeReminderEmail({
      firstName: "Gavin",
      intakeUrl: "https://noovi.com.au",
      fromName: "Noovi"
    });

    expect(email.subject).toBe("Quick follow-up on your website enquiry");
    expect(email.emailType).toBe("intake_reminder");
  });

  it("requires a preview URL for preview emails", () => {
    expect(() =>
      buildPreviewReadyEmail({
        firstName: "Gavin",
        intakeUrl: "https://noovi.com.au",
        fromName: "Noovi"
      })
    ).toThrow("Preview URL is required");
  });
});

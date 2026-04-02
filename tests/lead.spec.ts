import { describe, expect, it } from "vitest";

import {
  buildLeadIssuePayload,
  buildLeadIssueTitle,
  normalizeFormspreeWebhookPayload,
  validateLeadPayload
} from "../intake-form/lib/lead.mjs";

describe("validateLeadPayload", () => {
  it("accepts a valid landing-page lead payload", () => {
    const result = validateLeadPayload({
      name: "Steve Wilson",
      email: "steve@wilsonelectrical.com.au",
      trade: "Electrician",
      suburb: "Parramatta",
      message: "Looking for more leads"
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects missing or invalid core fields", () => {
    const result = validateLeadPayload({
      name: "",
      email: "not-an-email",
      trade: ""
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("name is required");
    expect(result.errors).toContain("email must be a valid email address");
    expect(result.errors).toContain("trade is required");
  });
});

describe("Formspree webhook normalization", () => {
  it("maps Formspree submission payloads into a lead payload", () => {
    const payload = normalizeFormspreeWebhookPayload({
      form: "xreogrkj",
      submission: {
        name: "Steve Wilson",
        email: "steve@wilsonelectrical.com.au",
        phone: "0412 345 678",
        trade: "Electrician",
        suburb: "Parramatta",
        package: "website-hosting",
        message: "Need a better website"
      }
    });

    expect(payload.name).toBe("Steve Wilson");
    expect(payload.source).toBe("formspree:xreogrkj");
    expect(payload.trade).toBe("Electrician");
  });
});

describe("lead issue mapping", () => {
  it("builds a deterministic new lead issue payload", () => {
    const payload = {
      name: "Steve Wilson",
      email: "steve@wilsonelectrical.com.au",
      phone: "0412 345 678",
      trade: "Electrician",
      suburb: "Parramatta",
      package: "website-hosting",
      message: "Need a better website",
      source: "formspree:xreogrkj"
    };

    expect(buildLeadIssueTitle(payload)).toBe("New Lead: Steve Wilson (Electrician)");

    const issue = buildLeadIssuePayload(payload, {
      assigneeAgentId: "growth-agent-id",
      projectId: "project-id"
    });

    expect(issue.title).toBe("New Lead: Steve Wilson (Electrician)");
    expect(issue.assigneeAgentId).toBe("growth-agent-id");
    expect(issue.projectId).toBe("project-id");
    expect(issue.priority).toBe("high");
    expect(issue.description).toContain("Source: formspree:xreogrkj");
  });
});

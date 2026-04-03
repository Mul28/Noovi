import { describe, expect, it } from "vitest";

import {
  buildContentIssuePayload,
  buildContentIssueTitle,
  findExistingContentIssue
} from "../intake-form/lib/delivery.mjs";

describe("delivery content mapping", () => {
  it("builds a deterministic CONTENT issue payload from a BUILD payload", () => {
    const payload = {
      business_name: "Gmbuild",
      primary_trade: "Tiler",
      main_suburb: "St Peters",
      service_areas: ["Inner west, sydney"],
      core_services: ["Grouting", "Replacement tiles"],
      tone_preference: "friendly",
      differentiators: "Reliable and affordable",
      mandatory_wording: ""
    };

    const buildIssue = {
      id: "build-123",
      identifier: "NOO-41",
      projectId: "project-1",
      goalId: "goal-1"
    };

    expect(buildContentIssueTitle(payload)).toBe("CONTENT: Gmbuild - Tiler");

    const issue = buildContentIssuePayload(payload, buildIssue, {
      assigneeAgentId: "content-agent-id"
    });

    expect(issue.title).toBe("CONTENT: Gmbuild - Tiler");
    expect(issue.parentId).toBe("build-123");
    expect(issue.assigneeAgentId).toBe("content-agent-id");
    expect(issue.projectId).toBe("project-1");
    expect(issue.goalId).toBe("goal-1");
    expect(issue.description).toContain("Source BUILD Issue: [NOO-41]");
    expect(issue.description).toContain("\"business_name\": \"Gmbuild\"");
  });

  it("reuses an existing CONTENT issue when one already exists", () => {
    const existing = findExistingContentIssue([
      { id: "1", title: "REVIEW: Gmbuild" },
      { id: "2", title: "CONTENT: Gmbuild - Tiler" }
    ]);

    expect(existing?.id).toBe("2");
  });
});

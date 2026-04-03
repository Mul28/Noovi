import { describe, expect, it } from "vitest";

import {
  buildPreviewUrl,
  buildReviewIssuePayload,
  findExistingGoLiveIssue,
  findExistingReviewIssue,
  findExistingRevisionIssue
} from "../intake-form/lib/review.mjs";

describe("review issue helpers", () => {
  const payload = {
    business_name: "Smith Plumbing",
    contact_name: "Sam Smith",
    contact_email: "sam@smithplumbing.com.au",
    primary_trade: "Plumber",
    main_suburb: "Marrickville",
    package_selected: "build_only",
    launch_option: "noovi_subdomain"
  };

  const buildIssue = {
    id: "build-1",
    identifier: "NOO-44",
    projectId: "project-1",
    goalId: "goal-1"
  };

  const contentIssue = {
    id: "content-1",
    identifier: "NOO-45"
  };

  it("builds a stable preview URL", () => {
    expect(
      buildPreviewUrl(buildIssue, { publicBaseUrl: "https://preview.noovi.com.au/" })
    ).toBe("https://preview.noovi.com.au/preview/NOO-44");
  });

  it("builds a REVIEW issue payload that Head of Growth can consume", () => {
    const issue = buildReviewIssuePayload(payload, buildIssue, contentIssue, {
      assigneeAgentId: "growth-1",
      publicBaseUrl: "https://preview.noovi.com.au"
    });

    expect(issue.title).toBe("REVIEW: Smith Plumbing");
    expect(issue.assigneeAgentId).toBe("growth-1");
    expect(issue.description).toContain("Name: Sam Smith");
    expect(issue.description).toContain("Email: sam@smithplumbing.com.au");
    expect(issue.description).toContain("Preview URL: https://preview.noovi.com.au/preview/NOO-44");
  });

  it("finds review, revision, and golive issues by prefix", () => {
    const issues = [
      { id: "1", title: "REVIEW: Smith Plumbing", status: "backlog" },
      { id: "2", title: "REVISIONS: Smith Plumbing", status: "in_progress" },
      { id: "3", title: "GOLIVE: Smith Plumbing", status: "backlog" }
    ];

    expect(findExistingReviewIssue(issues)?.id).toBe("1");
    expect(findExistingRevisionIssue(issues)?.id).toBe("2");
    expect(findExistingGoLiveIssue(issues)?.id).toBe("3");
  });
});

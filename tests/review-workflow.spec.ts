import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureReviewIssueForContent,
  recordReviewDecision
} from "../intake-form/lib/review-workflow.mjs";

describe("review workflow", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PAPERCLIP_API_URL = "http://paperclip.test";
    process.env.PAPERCLIP_API_KEY = "pcp_test";
    process.env.PAPERCLIP_COMPANY_ID = "company-id";
    process.env.HEAD_OF_GROWTH_AGENT_ID = "growth-agent-id";
    process.env.HEAD_OF_DELIVERY_AGENT_ID = "delivery-agent-id";
    process.env.PREVIEW_BASE_URL = "https://preview.noovi.com.au";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("creates a REVIEW issue from a completed CONTENT issue", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "content-1",
          identifier: "NOO-45",
          parentId: "build-1"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "build-1",
          identifier: "NOO-44",
          projectId: "project-1",
          goalId: "goal-1",
          description: [
            "Intake Payload:",
            "```json",
            JSON.stringify(
              {
                business_name: "Smith Plumbing",
                contact_name: "Sam Smith",
                contact_email: "sam@smithplumbing.com.au",
                primary_trade: "Plumber",
                main_suburb: "Marrickville",
                package_selected: "build_only",
                launch_option: "noovi_subdomain"
              },
              null,
              2
            ),
            "```"
          ].join("\n")
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "content-1", title: "CONTENT: Smith Plumbing - Plumber" }]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "review-1", identifier: "NOO-46" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-1" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-2" })
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await ensureReviewIssueForContent("content-1");

    expect(result.created).toBe(true);
    expect(result.reviewIssue?.identifier).toBe("NOO-46");
    expect(result.previewUrl).toBe("https://preview.noovi.com.au/preview/NOO-44");

    const createBody = JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string);
    expect(createBody.title).toBe("REVIEW: Smith Plumbing");
    expect(createBody.description).toContain("Preview URL: https://preview.noovi.com.au/preview/NOO-44");
  });

  it("creates a REVISIONS issue when a review decision requests changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "review-1",
          identifier: "NOO-46",
          parentId: "build-1",
          description: "Preview URL: https://preview.noovi.com.au/preview/NOO-44\nRevision Round: 0"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "build-1",
          identifier: "NOO-44",
          projectId: "project-1",
          goalId: "goal-1",
          description: [
            "Intake Payload:",
            "```json",
            JSON.stringify(
              {
                business_name: "Smith Plumbing",
                primary_trade: "Plumber",
                launch_option: "noovi_subdomain"
              },
              null,
              2
            ),
            "```"
          ].join("\n")
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "review-1", title: "REVIEW: Smith Plumbing", status: "backlog" }]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "rev-1", identifier: "NOO-47" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-1" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-2" })
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await recordReviewDecision("review-1", {
      decision: "changes_requested",
      requestedChanges: "Swap the hero headline and add one more service."
    });

    expect(result.action).toBe("revision_created");
    expect(result.relatedIssue?.identifier).toBe("NOO-47");

    const createBody = JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string);
    expect(createBody.title).toBe("REVISIONS: Smith Plumbing");
    expect(createBody.description).toContain("Swap the hero headline");
  });
});

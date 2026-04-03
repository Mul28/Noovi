import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handler } from "../netlify/functions/bridge.mjs";

describe("bridge intake flow", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PAPERCLIP_API_URL = "http://paperclip.test";
    process.env.PAPERCLIP_API_KEY = "pcp_test";
    process.env.PAPERCLIP_COMPANY_ID = "company-id";
    process.env.PAPERCLIP_PROJECT_ID = "project-id";
    process.env.HEAD_OF_DELIVERY_AGENT_ID = "delivery-agent-id";
    process.env.CONTENT_LEAD_AGENT_ID = "content-agent-id";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("creates a BUILD issue, posts a kickoff comment, and creates the CONTENT handoff", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "issue-123", identifier: "NOO-99" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-1" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "content-123", identifier: "NOO-100", parentId: "issue-123" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-2" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-3" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "issue-123", status: "in_progress" })
      });

    vi.stubGlobal("fetch", fetchMock);

    const response = await handler({
      httpMethod: "POST",
      path: "/.netlify/functions/bridge/intake",
      body: JSON.stringify({
        business_name: "Smith Plumbing",
        contact_name: "Sam Smith",
        contact_email: "sam@smithplumbing.com.au",
        primary_trade: "Plumber",
        main_suburb: "Marrickville",
        service_areas: ["Marrickville", "Newtown"],
        core_services: ["Blocked drains", "Hot water", "Leak repairs"],
        website_goal: "more_quote_requests",
        package_selected: "build_only",
        launch_option: "noovi_subdomain"
      })
    });

    expect(response.statusCode).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/companies/company-id/issues");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/issues/issue-123/comments");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/api/companies/company-id/issues?parentId=issue-123");
    expect(fetchMock.mock.calls[3]?.[0]).toContain("/api/companies/company-id/issues");
    expect(fetchMock.mock.calls[4]?.[0]).toContain("/api/issues/content-123/comments");
    expect(fetchMock.mock.calls[5]?.[0]).toContain("/api/issues/issue-123/comments");
    expect(fetchMock.mock.calls[6]?.[0]).toContain("/api/issues/issue-123");

    const kickoffBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(kickoffBody.body).toContain("Process this BUILD issue now.");
    expect(kickoffBody.body).toContain("create_content_issue.mjs");

    const contentIssueBody = JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string);
    expect(contentIssueBody.title).toBe("CONTENT: Smith Plumbing - Plumber");

    const issueStatusBody = JSON.parse(fetchMock.mock.calls[6]?.[1]?.body as string);
    expect(issueStatusBody.status).toBe("in_progress");
  });

  it("accepts the public /api/formspree/webhook path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "issue-456", identifier: "NOO-100" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-2" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "comment-3" })
      });

    vi.stubGlobal("fetch", fetchMock);
    process.env.RESEND_API_KEY = "";

    const response = await handler({
      httpMethod: "POST",
      path: "/api/formspree/webhook",
      body: JSON.stringify({
        form: "xreogrkj",
        submission: {
          name: "Webhook Test Tradie",
          email: "test@example.com",
          phone: "0412 111 222",
          trade: "Painter",
          suburb: "Bondi",
          package: "website-hosting",
          message: "Need a fresh website and more leads"
        }
      })
    });

    expect(response.statusCode).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/companies/company-id/issues");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/issues/issue-456/comments");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/api/issues/issue-456/comments");
  });
});

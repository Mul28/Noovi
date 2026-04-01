import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  send_intake_reminder_email_for_issue,
  send_preview_ready_email_for_issue,
  send_welcome_email_for_issue
} from "../src/worker.js";

const fetchMock = vi.fn();

describe("worker actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PAPERCLIP_API_URL = "http://paperclip.test";
    process.env.PAPERCLIP_API_KEY = "pcp_test";
    process.env.INTAKE_FORM_URL = "https://noovi.com.au";
    process.env.EMAIL_FROM_NAME = "Noovi";
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends the welcome email and logs the result", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "issue-1",
            description: "Name: Test Tradie\nEmail: test@example.com\nTrade: Plumber"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, messageId: "msg-1" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    const result = await send_welcome_email_for_issue({ issueId: "issue-1" });

    expect(result).toMatchObject({
      ok: true,
      recipient: "test@example.com",
      emailType: "welcome",
      messageId: "msg-1"
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("sends an intake reminder email", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "issue-2",
            description: "Name: Test Tradie\nEmail: test@example.com"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, messageId: "msg-2" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    const result = await send_intake_reminder_email_for_issue({ issueId: "issue-2" });

    expect(result).toMatchObject({
      ok: true,
      recipient: "test@example.com",
      emailType: "intake_reminder",
      messageId: "msg-2"
    });
  });

  it("returns a helpful error when preview URL is missing", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "issue-3",
            description: "Name: Test Tradie\nEmail: test@example.com"
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    const result = await send_preview_ready_email_for_issue({ issueId: "issue-3" });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Preview URL is required");
  });
});

import { buildBuildIssuePayload, validateIntakePayload } from "../../intake-form/lib/intake.mjs";
import {
  buildContentIssuePayload,
  findExistingContentIssue
} from "../../intake-form/lib/delivery.mjs";
import {
  completeGoLiveIssue,
  completeRevisionIssue,
  ensureReviewIssueForContent,
  recordReviewDecision
} from "../../intake-form/lib/review-workflow.mjs";
import {
  buildLeadIssuePayload,
  normalizeFormspreeWebhookPayload,
  validateLeadPayload
} from "../../intake-form/lib/lead.mjs";
import { sendLeadWelcomeEmail } from "../../intake-form/lib/lead-email.mjs";
import {
  buildPreviewUrl,
  extractBuildPayload
} from "../../intake-form/lib/review.mjs";
import {
  getIssueByIdentifier,
  listIssueComments as paperclipListIssueComments
} from "../../intake-form/lib/paperclip.mjs";
import {
  pickLatestContentComment,
  renderPreviewHtml
} from "../../intake-form/lib/preview.mjs";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body, null, 2)
  };
}

function normalizeRequestPath(rawPath = "") {
  if (rawPath.startsWith("/.netlify/functions/bridge")) {
    const stripped = rawPath.replace(/^\/\.netlify\/functions\/bridge/, "");
    return stripped || "/";
  }

  if (rawPath.startsWith("/api")) {
    const stripped = rawPath.replace(/^\/api/, "");
    return stripped || "/";
  }

  return rawPath || "/";
}

function getEventBaseUrl(event) {
  const protocol = event.headers?.["x-forwarded-proto"] || "https";
  const host = event.headers?.host;
  return host ? `${protocol}://${host}` : "https://golden-cassata-1dcf30.netlify.app";
}

async function createIssue(issuePayload) {
  const apiUrl = process.env.PAPERCLIP_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  const companyId = process.env.PAPERCLIP_COMPANY_ID;

  if (!apiUrl || !apiKey || !companyId) {
    return { dryRun: true, issuePayload };
  }

  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/api/companies/${companyId}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(issuePayload)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paperclip issue creation failed: ${response.status} ${errorText}`);
  }

  return { dryRun: false, issue: await response.json(), issuePayload };
}

async function addIssueComment(issueId, body) {
  const apiUrl = process.env.PAPERCLIP_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;

  if (!apiUrl || !apiKey) {
    return { ok: false, skipped: true };
  }

  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/api/issues/${issueId}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paperclip comment creation failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function updateIssueStatus(issueId, status) {
  const apiUrl = process.env.PAPERCLIP_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;

  if (!apiUrl || !apiKey) {
    return { ok: false, skipped: true };
  }

  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/api/issues/${issueId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paperclip issue update failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function listChildIssues(parentId) {
  const apiUrl = process.env.PAPERCLIP_API_URL;
  const apiKey = process.env.PAPERCLIP_API_KEY;
  const companyId = process.env.PAPERCLIP_COMPANY_ID;

  if (!apiUrl || !apiKey || !companyId) {
    return [];
  }

  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/api/companies/${companyId}/issues?parentId=${encodeURIComponent(parentId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paperclip child issue listing failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function kickoffBuildIssue(issueId) {
  return addIssueComment(
    issueId,
    [
      "Process this BUILD issue now.",
      "Read the intake payload on the issue, create the CONTENT handoff, and stop after logging the result.",
      'If the repo workspace is available, use:',
      '`node skills/noovi-delivery-orchestration/scripts/create_content_issue.mjs --issue-id "$PAPERCLIP_TASK_ID"`'
    ].join("\n")
  );
}

async function ensureContentIssueForBuild(buildIssue, payload) {
  const existing = findExistingContentIssue(await listChildIssues(buildIssue.id));

  if (existing) {
    await updateIssueStatus(buildIssue.id, "in_progress");
    await addIssueComment(
      buildIssue.id,
      `CONTENT issue already exists: [${existing.identifier}](/NOO/issues/${existing.identifier}).`
    );

    return { created: false, contentIssue: existing };
  }

  const issuePayload = buildContentIssuePayload(payload, buildIssue, {
    assigneeAgentId: process.env.CONTENT_LEAD_AGENT_ID
  });
  const result = await createIssue(issuePayload);

  await addIssueComment(
    result.issue.id,
    [
      "Write the structured copy for this CONTENT issue as a single issue comment using the required section headings.",
      "When the copy is complete, run:",
      '`node skills/noovi-delivery-orchestration/scripts/create_review_issue.mjs --content-issue-id "$PAPERCLIP_TASK_ID"`',
      "Then stop."
    ].join("\n")
  );
  await addIssueComment(
    buildIssue.id,
    `Created CONTENT handoff: [${result.issue.identifier}](/NOO/issues/${result.issue.identifier}). Waiting on Content Lead copy before preview build.`
  );
  await updateIssueStatus(buildIssue.id, "in_progress");

  return { created: true, contentIssue: result.issue };
}

async function handleLeadIssueCreation(payload) {
  const issuePayload = buildLeadIssuePayload(payload, {
    assigneeAgentId: process.env.HEAD_OF_GROWTH_AGENT_ID,
    projectId: process.env.PAPERCLIP_PROJECT_ID
  });

  const issueResult = await createIssue(issuePayload);
  let emailResult = null;

  if (!issueResult.dryRun) {
    try {
      emailResult = await sendLeadWelcomeEmail(payload);
      await addIssueComment(
        issueResult.issue.id,
        `Recipient: ${payload.email}
Subject: ${emailResult.subject}
Email type: welcome email
Outcome: sent successfully
Message ID: ${emailResult.id}
Next step: wait for intake form completion or reply.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error";
      emailResult = { ok: false, error: message };
      await addIssueComment(
        issueResult.issue.id,
        `Recipient: ${payload.email}
Subject: Thanks for your enquiry
Email type: welcome email
Outcome: failed
Error: ${message}
Next step: investigate email sending before retrying.`
      );
    }

    await addIssueComment(
      issueResult.issue.id,
      "Process this new lead and continue the email-only workflow from here."
    );
  }

  return {
    ...issueResult,
    emailResult
  };
}

export async function handler(event) {
  try {
    const path = normalizeRequestPath(event.path);
    if (event.httpMethod === "GET" && (path === "/health" || path === "" || path === "/")) {
      return json(200, { ok: true });
    }

    if (event.httpMethod === "GET" && path.startsWith("/preview/")) {
      const buildIdentifier = path.replace(/^\/preview\//, "").trim();
      const buildIssue = await getIssueByIdentifier(buildIdentifier);

      if (!buildIssue) {
        return {
          statusCode: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<h1>Preview not found</h1>"
        };
      }

      const children = await listChildIssues(buildIssue.id);
      const contentIssue = findExistingContentIssue(children);

      if (!contentIssue) {
        return {
          statusCode: 409,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<h1>Preview not ready</h1><p>No CONTENT issue exists yet for this build.</p>"
        };
      }

      const comments = await paperclipListIssueComments(contentIssue.id);
      const contentComment = pickLatestContentComment(comments);

      if (!contentComment) {
        return {
          statusCode: 409,
          headers: { "content-type": "text/html; charset=utf-8" },
          body: "<h1>Preview not ready</h1><p>Content output is not available yet.</p>"
        };
      }

      const payloadFromBuild = extractBuildPayload(buildIssue.description || "");
      const previewUrl = buildPreviewUrl(buildIssue, { publicBaseUrl: getEventBaseUrl(event) });
      const html = renderPreviewHtml({
        buildIssue,
        payload: payloadFromBuild,
        previewUrl,
        contentIssue,
        contentComment
      });

      return {
        statusCode: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: html
      };
    }

    const payload = event.body ? JSON.parse(event.body) : {};

    if (event.httpMethod === "POST" && path === "/intake") {
      const validation = validateIntakePayload(payload);
      if (!validation.ok) {
        return json(400, { ok: false, errors: validation.errors });
      }

      const issuePayload = buildBuildIssuePayload(validation.value, {
        assigneeAgentId: process.env.HEAD_OF_DELIVERY_AGENT_ID,
        projectId: process.env.PAPERCLIP_PROJECT_ID
      });

      const result = await createIssue(issuePayload);
      if (!result.dryRun) {
        await kickoffBuildIssue(result.issue.id);
        await ensureContentIssueForBuild(result.issue, validation.value);
      }
      return json(result.dryRun ? 202 : 201, {
        ok: true,
        dryRun: result.dryRun,
        issue: result.issue || null,
        issuePayload: result.issuePayload
      });
    }

    if (event.httpMethod === "POST" && path === "/review/from-content") {
      if (!payload.content_issue_id) {
        return json(400, { ok: false, error: "content_issue_id is required" });
      }

      const result = await ensureReviewIssueForContent(
        payload.content_issue_id,
        { publicBaseUrl: getEventBaseUrl(event) },
        process.env
      );

      return json(result.dryRun ? 202 : 201, {
        ok: true,
        created: result.created,
        reviewIssue: result.reviewIssue || null,
        previewUrl: result.previewUrl
      });
    }

    if (event.httpMethod === "POST" && path === "/review-decision") {
      if (!payload.review_issue_id || !payload.decision) {
        return json(400, { ok: false, error: "review_issue_id and decision are required" });
      }

      const result = await recordReviewDecision(
        payload.review_issue_id,
        {
          decision: payload.decision,
          requestedChanges: payload.requested_changes || "",
          paymentConfirmed: Boolean(payload.payment_confirmed),
          domainTarget: payload.domain_target || "",
          liveUrl: payload.live_url || ""
        },
        process.env
      );

      return json(200, { ok: true, ...result });
    }

    if (event.httpMethod === "POST" && path === "/revision/complete") {
      if (!payload.revision_issue_id) {
        return json(400, { ok: false, error: "revision_issue_id is required" });
      }

      const result = await completeRevisionIssue(
        payload.revision_issue_id,
        { updatedPreviewUrl: payload.updated_preview_url || "" },
        process.env
      );

      return json(200, { ok: true, ...result });
    }

    if (event.httpMethod === "POST" && path === "/golive/complete") {
      if (!payload.golive_issue_id || !payload.live_url) {
        return json(400, { ok: false, error: "golive_issue_id and live_url are required" });
      }

      const result = await completeGoLiveIssue(
        payload.golive_issue_id,
        { liveUrl: payload.live_url, sendEmail: Boolean(payload.send_email) },
        process.env
      );

      return json(200, { ok: true, ...result });
    }

    if (event.httpMethod === "POST" && path === "/lead") {
      const validation = validateLeadPayload(payload);
      if (!validation.ok) {
        return json(400, { ok: false, errors: validation.errors });
      }

      const result = await handleLeadIssueCreation(validation.value);
      return json(result.dryRun ? 202 : 201, {
        ok: true,
        dryRun: result.dryRun,
        issue: result.issue || null,
        issuePayload: result.issuePayload,
        emailResult: result.emailResult
      });
    }

    if (event.httpMethod === "POST" && path === "/formspree/webhook") {
      const validation = validateLeadPayload(normalizeFormspreeWebhookPayload(payload));
      if (!validation.ok) {
        return json(400, { ok: false, errors: validation.errors });
      }

      const result = await handleLeadIssueCreation(validation.value);
      return json(result.dryRun ? 202 : 201, {
        ok: true,
        dryRun: result.dryRun,
        issue: result.issue || null,
        issuePayload: result.issuePayload,
        emailResult: result.emailResult
      });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}

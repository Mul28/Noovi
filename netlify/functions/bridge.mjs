import { buildBuildIssuePayload, validateIntakePayload } from "../../intake-form/lib/intake.mjs";
import {
  buildLeadIssuePayload,
  normalizeFormspreeWebhookPayload,
  validateLeadPayload
} from "../../intake-form/lib/lead.mjs";
import { sendLeadWelcomeEmail } from "../../intake-form/lib/lead-email.mjs";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body, null, 2)
  };
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
    const path = event.path.replace(/^\/\.netlify\/functions\/bridge/, "");
    if (event.httpMethod === "GET" && (path === "/health" || path === "" || path === "/")) {
      return json(200, { ok: true });
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
      return json(result.dryRun ? 202 : 201, {
        ok: true,
        dryRun: result.dryRun,
        issue: result.issue || null,
        issuePayload: result.issuePayload
      });
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

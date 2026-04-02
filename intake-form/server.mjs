import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuildIssuePayload,
  validateIntakePayload
} from "./lib/intake.mjs";
import {
  buildLeadIssuePayload,
  normalizeFormspreeWebhookPayload,
  validateLeadPayload
} from "./lib/lead.mjs";
import { sendLeadWelcomeEmail } from "./lib/lead-email.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 8787);

function json(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

function getContentType(filePath) {
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "text/html; charset=utf-8";
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const filePath =
    url.pathname === "/"
      ? path.join(publicDir, "index.html")
      : path.join(publicDir, url.pathname.replace(/^\/+/, ""));

  if (!filePath.startsWith(publicDir)) {
    json(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const contents = await readFile(filePath);
    response.writeHead(200, { "Content-Type": getContentType(filePath) });
    response.end(contents);
  } catch {
    json(response, 404, { error: "Not found" });
  }
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function createBuildIssue(issuePayload) {
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

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      json(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && request.url === "/api/intake") {
      const payload = await readJsonBody(request);
      const validation = validateIntakePayload(payload);

      if (!validation.ok) {
        json(response, 400, { ok: false, errors: validation.errors });
        return;
      }

      const issuePayload = buildBuildIssuePayload(validation.value, {
        assigneeAgentId: process.env.HEAD_OF_DELIVERY_AGENT_ID,
        projectId: process.env.PAPERCLIP_PROJECT_ID
      });

      const result = await createBuildIssue(issuePayload);
      if (!result.dryRun) {
        await kickoffBuildIssue(result.issue.id);
      }
      json(response, result.dryRun ? 202 : 201, {
        ok: true,
        dryRun: result.dryRun,
        issue: result.issue || null,
        issuePayload: result.issuePayload
      });
      return;
    }

    if (request.method === "POST" && request.url === "/api/lead") {
      const payload = await readJsonBody(request);
      const validation = validateLeadPayload(payload);

      if (!validation.ok) {
        json(response, 400, { ok: false, errors: validation.errors });
        return;
      }

      const result = await handleLeadIssueCreation(validation.value);
      json(response, result.dryRun ? 202 : 201, {
        ok: true,
        dryRun: result.dryRun,
        issue: result.issue || null,
        issuePayload: result.issuePayload,
        emailResult: result.emailResult
      });
      return;
    }

    if (request.method === "POST" && request.url === "/api/formspree/webhook") {
      const payload = await readJsonBody(request);
      const validation = validateLeadPayload(normalizeFormspreeWebhookPayload(payload));

      if (!validation.ok) {
        json(response, 400, { ok: false, errors: validation.errors });
        return;
      }

      const result = await handleLeadIssueCreation(validation.value);
      json(response, result.dryRun ? 202 : 201, {
        ok: true,
        dryRun: result.dryRun,
        issue: result.issue || null,
        issuePayload: result.issuePayload,
        emailResult: result.emailResult
      });
      return;
    }

    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }

    json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    json(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Noovi intake form listening on http://localhost:${PORT}`);
});

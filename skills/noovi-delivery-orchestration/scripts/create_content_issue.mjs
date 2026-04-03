#!/usr/bin/env node

import {
  buildContentIssuePayload,
  findExistingContentIssue as findExistingContentIssueInList
} from "../../../intake-form/lib/delivery.mjs";

const REQUIRED_FIELDS = [
  "business_name",
  "contact_email",
  "primary_trade",
  "main_suburb",
  "service_areas",
  "core_services",
  "package_selected",
  "launch_option"
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function paperclipRequest(path, init = {}) {
  const apiUrl = requireEnv("PAPERCLIP_API_URL").replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${requireEnv("PAPERCLIP_API_KEY")}`,
    "Content-Type": "application/json",
    ...init.headers
  };

  if (process.env.PAPERCLIP_RUN_ID) {
    headers["X-Paperclip-Run-Id"] = process.env.PAPERCLIP_RUN_ID;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`Paperclip request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function extractIntakePayload(description = "") {
  const match = description.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) {
    throw new Error("BUILD issue does not contain an intake payload JSON block");
  }

  return JSON.parse(match[1]);
}

function validatePayload(payload) {
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = payload[field];
    return Array.isArray(value) ? value.length === 0 : !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required BUILD fields: ${missing.join(", ")}`);
  }
}

async function findExistingContentIssue(buildIssueId) {
  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const issues = await paperclipRequest(
    `/api/companies/${companyId}/issues?parentId=${encodeURIComponent(buildIssueId)}`
  );

  return findExistingContentIssueInList(issues);
}

async function addIssueComment(issueId, body) {
  return paperclipRequest(`/api/issues/${issueId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

async function updateIssueStatus(issueId, status) {
  return paperclipRequest(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const issueId = args["issue-id"];

  if (!issueId) {
    throw new Error("Missing required argument: --issue-id");
  }

  const buildIssue = await paperclipRequest(`/api/issues/${issueId}`);
  const payload = extractIntakePayload(buildIssue.description || "");
  validatePayload(payload);

  const existing = await findExistingContentIssue(issueId);
  if (existing) {
    await updateIssueStatus(issueId, "in_progress");
    await addIssueComment(
      issueId,
      `CONTENT issue already exists: [${existing.identifier}](/NOO/issues/${existing.identifier}).`
    );
    console.log(
      JSON.stringify(
        {
          ok: true,
          issueId,
          contentIssueId: existing.id,
          contentIdentifier: existing.identifier,
          created: false
        },
        null,
        2
      )
    );
    return;
  }

  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const contentLeadAgentId = requireEnv("CONTENT_LEAD_AGENT_ID");
  const issuePayload = buildContentIssuePayload(payload, buildIssue, {
    assigneeAgentId: contentLeadAgentId
  });

  const contentIssue = await paperclipRequest(`/api/companies/${companyId}/issues`, {
    method: "POST",
    body: JSON.stringify(issuePayload)
  });

  await addIssueComment(
    contentIssue.id,
    "Write the structured copy for this CONTENT issue as a single issue comment using the required section headings, then stop."
  );

  await addIssueComment(
      issueId,
      `Created CONTENT handoff: [${contentIssue.identifier}](/NOO/issues/${contentIssue.identifier}). Waiting on Content Lead copy before preview build.`
  );
  await updateIssueStatus(issueId, "in_progress");

  console.log(
    JSON.stringify(
      {
        ok: true,
        issueId,
        contentIssueId: contentIssue.id,
        contentIdentifier: contentIssue.identifier,
        created: true
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

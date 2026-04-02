#!/usr/bin/env node

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

function buildContentDescription(payload, buildIssue) {
  return [
    `Business Name: ${payload.business_name}`,
    `Primary Trade: ${payload.primary_trade}`,
    `Main Suburb: ${payload.main_suburb}`,
    `Service Areas: ${payload.service_areas.join(", ")}`,
    `Core Services: ${payload.core_services.join(", ")}`,
    `Tone Preference: ${payload.tone_preference || "straightforward"}`,
    `Differentiators: ${payload.differentiators || "Not provided"}`,
    `Compliance Notes: ${payload.mandatory_wording || "None provided"}`,
    "",
    `Source BUILD Issue: [${buildIssue.identifier}](/NOO/issues/${buildIssue.identifier})`,
    "",
    "Required output:",
    "- Hero headline",
    "- Hero subheadline",
    "- Services section",
    "- About section",
    "- Trust section",
    "- Testimonials section with [PLACEHOLDER] markers if synthetic",
    "- SEO title",
    "- SEO meta description",
    "",
    "Intake Payload:",
    "```json",
    JSON.stringify(payload, null, 2),
    "```"
  ].join("\n");
}

async function findExistingContentIssue(buildIssueId) {
  const companyId = requireEnv("PAPERCLIP_COMPANY_ID");
  const issues = await paperclipRequest(
    `/api/companies/${companyId}/issues?parentId=${encodeURIComponent(buildIssueId)}`
  );

  return issues.find((issue) => /^CONTENT: /.test(issue.title)) || null;
}

async function addIssueComment(issueId, body) {
  return paperclipRequest(`/api/issues/${issueId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body })
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
  const title = `CONTENT: ${payload.business_name} - ${payload.primary_trade}`;
  const description = buildContentDescription(payload, buildIssue);

  const contentIssue = await paperclipRequest(`/api/companies/${companyId}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title,
      description,
      priority: "medium",
      assigneeAgentId: contentLeadAgentId,
      projectId: buildIssue.projectId,
      goalId: buildIssue.goalId,
      parentId: buildIssue.id
    })
  });

  await addIssueComment(
    contentIssue.id,
    "Write the structured copy for this CONTENT issue as a single issue comment using the required section headings, then stop."
  );

  await addIssueComment(
    issueId,
    `Created CONTENT handoff: [${contentIssue.identifier}](/NOO/issues/${contentIssue.identifier}). Waiting on Content Lead copy before preview build.`
  );

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

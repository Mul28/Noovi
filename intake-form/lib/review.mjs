const REVIEW_TITLE_PREFIX = "REVIEW: ";
const REVISIONS_TITLE_PREFIX = "REVISIONS: ";
const GOLIVE_TITLE_PREFIX = "GOLIVE: ";

function normalizeBaseUrl(value) {
  return (value || "").trim().replace(/\/$/, "");
}

export function extractBuildPayload(description = "") {
  const match = description.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) {
    throw new Error("BUILD issue does not contain an intake payload JSON block");
  }

  return JSON.parse(match[1]);
}

export function getPublicBaseUrl(config = {}, env = process.env) {
  const explicit =
    config.publicBaseUrl ||
    env.PREVIEW_BASE_URL ||
    env.NOOVI_PUBLIC_BASE_URL ||
    (env.INTAKE_FORM_URL ? env.INTAKE_FORM_URL.replace(/\/start\/?$/, "") : "");

  return normalizeBaseUrl(explicit) || "https://golden-cassata-1dcf30.netlify.app";
}

export function buildPreviewUrl(buildIssue, config = {}, env = process.env) {
  return `${getPublicBaseUrl(config, env)}/preview/${buildIssue.identifier}`;
}

export function buildReviewIssueTitle(payload) {
  return `${REVIEW_TITLE_PREFIX}${payload.business_name}`;
}

export function buildReviewIssueDescription(payload, buildIssue, contentIssue, previewUrl, revisionRound = 0) {
  return [
    `Name: ${payload.contact_name}`,
    `Email: ${payload.contact_email}`,
    `Trade: ${payload.primary_trade}`,
    `Preview URL: ${previewUrl}`,
    `Preview Version: ${contentIssue.identifier}`,
    `Revision Round: ${revisionRound}`,
    `Message: Review the preview and reply with approval or requested changes.`,
    "",
    `Business Name: ${payload.business_name}`,
    `Main Suburb: ${payload.main_suburb}`,
    `Package Selected: ${payload.package_selected}`,
    `Launch Option: ${payload.launch_option}`,
    "",
    `Source BUILD Issue: [${buildIssue.identifier}](/NOO/issues/${buildIssue.identifier})`,
    `Source CONTENT Issue: [${contentIssue.identifier}](/NOO/issues/${contentIssue.identifier})`,
    "",
    "Review Payload:",
    "```json",
    JSON.stringify(
      {
        business_name: payload.business_name,
        contact_name: payload.contact_name,
        contact_email: payload.contact_email,
        primary_trade: payload.primary_trade,
        preview_url: previewUrl,
        preview_version: contentIssue.identifier,
        revision_round: revisionRound,
        build_issue_identifier: buildIssue.identifier,
        content_issue_identifier: contentIssue.identifier,
        launch_option: payload.launch_option,
        package_selected: payload.package_selected
      },
      null,
      2
    ),
    "```"
  ].join("\n");
}

export function buildReviewIssuePayload(payload, buildIssue, contentIssue, config = {}, env = process.env) {
  const previewUrl = buildPreviewUrl(buildIssue, config, env);
  const issue = {
    title: buildReviewIssueTitle(payload),
    description: buildReviewIssueDescription(payload, buildIssue, contentIssue, previewUrl, 0),
    priority: "medium",
    parentId: buildIssue.id
  };

  if (config.assigneeAgentId) {
    issue.assigneeAgentId = config.assigneeAgentId;
  }

  if (buildIssue.projectId) {
    issue.projectId = buildIssue.projectId;
  }

  if (buildIssue.goalId) {
    issue.goalId = buildIssue.goalId;
  }

  return issue;
}

export function buildRevisionIssueTitle(payload) {
  return `${REVISIONS_TITLE_PREFIX}${payload.business_name}`;
}

export function buildRevisionIssueDescription(
  payload,
  buildIssue,
  reviewIssue,
  requestedChanges,
  revisionRound,
  previewUrl
) {
  return [
    `Business Name: ${payload.business_name}`,
    `Primary Trade: ${payload.primary_trade}`,
    `Revision Round: ${revisionRound}`,
    `Preview URL: ${previewUrl}`,
    "",
    `Source BUILD Issue: [${buildIssue.identifier}](/NOO/issues/${buildIssue.identifier})`,
    `Source REVIEW Issue: [${reviewIssue.identifier}](/NOO/issues/${reviewIssue.identifier})`,
    "",
    "Requested Changes:",
    requestedChanges || "No change list supplied.",
    "",
    "Revision Payload:",
    "```json",
    JSON.stringify(
      {
        business_name: payload.business_name,
        primary_trade: payload.primary_trade,
        revision_round: revisionRound,
        preview_url: previewUrl,
        requested_changes: requestedChanges
      },
      null,
      2
    ),
    "```"
  ].join("\n");
}

export function buildRevisionIssuePayload(
  payload,
  buildIssue,
  reviewIssue,
  requestedChanges,
  revisionRound,
  config = {},
  env = process.env
) {
  const previewUrl = buildPreviewUrl(buildIssue, config, env);
  const issue = {
    title: buildRevisionIssueTitle(payload),
    description: buildRevisionIssueDescription(
      payload,
      buildIssue,
      reviewIssue,
      requestedChanges,
      revisionRound,
      previewUrl
    ),
    priority: "medium",
    parentId: buildIssue.id
  };

  if (config.assigneeAgentId) {
    issue.assigneeAgentId = config.assigneeAgentId;
  }

  if (buildIssue.projectId) {
    issue.projectId = buildIssue.projectId;
  }

  if (buildIssue.goalId) {
    issue.goalId = buildIssue.goalId;
  }

  return issue;
}

export function buildGoLiveIssueTitle(payload) {
  return `${GOLIVE_TITLE_PREFIX}${payload.business_name}`;
}

export function buildGoLiveIssueDescription(
  payload,
  buildIssue,
  reviewIssue,
  config = {},
  env = process.env
) {
  const previewUrl = buildPreviewUrl(buildIssue, config, env);
  const target =
    config.domainTarget ||
    payload.domain_name ||
    `${payload.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.noovi.com.au`;

  return [
    `Business Name: ${payload.business_name}`,
    `Primary Trade: ${payload.primary_trade}`,
    `Preview URL: ${previewUrl}`,
    `Domain Target: ${target}`,
    "",
    `Source BUILD Issue: [${buildIssue.identifier}](/NOO/issues/${buildIssue.identifier})`,
    `Source REVIEW Issue: [${reviewIssue.identifier}](/NOO/issues/${reviewIssue.identifier})`,
    "",
    "Go-Live Payload:",
    "```json",
    JSON.stringify(
      {
        business_name: payload.business_name,
        primary_trade: payload.primary_trade,
        preview_url: previewUrl,
        domain_target: target,
        launch_option: payload.launch_option
      },
      null,
      2
    ),
    "```"
  ].join("\n");
}

export function buildGoLiveIssuePayload(payload, buildIssue, reviewIssue, config = {}, env = process.env) {
  const issue = {
    title: buildGoLiveIssueTitle(payload),
    description: buildGoLiveIssueDescription(payload, buildIssue, reviewIssue, config, env),
    priority: "medium",
    parentId: buildIssue.id
  };

  if (config.assigneeAgentId) {
    issue.assigneeAgentId = config.assigneeAgentId;
  }

  if (buildIssue.projectId) {
    issue.projectId = buildIssue.projectId;
  }

  if (buildIssue.goalId) {
    issue.goalId = buildIssue.goalId;
  }

  return issue;
}

export function extractPreviewUrl(description = "") {
  const match = description.match(/^Preview URL:\s*(.+)$/im);
  return match ? match[1].trim() : "";
}

export function extractRevisionRound(description = "") {
  const match = description.match(/^Revision Round:\s*(\d+)$/im);
  return match ? Number(match[1]) : 0;
}

export function findExistingReviewIssue(issues = []) {
  return issues.find((issue) => issue.title?.startsWith(REVIEW_TITLE_PREFIX)) || null;
}

export function findExistingRevisionIssue(issues = []) {
  return issues.find((issue) => issue.title?.startsWith(REVISIONS_TITLE_PREFIX) && issue.status !== "done") || null;
}

export function findExistingGoLiveIssue(issues = []) {
  return issues.find((issue) => issue.title?.startsWith(GOLIVE_TITLE_PREFIX)) || null;
}

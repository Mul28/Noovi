const CONTENT_TITLE_PREFIX = "CONTENT: ";

export function buildContentIssueTitle(payload) {
  return `${CONTENT_TITLE_PREFIX}${payload.business_name} - ${payload.primary_trade}`;
}

export function buildContentIssueDescription(payload, buildIssue) {
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

export function buildContentIssuePayload(payload, buildIssue, config = {}) {
  const issue = {
    title: buildContentIssueTitle(payload),
    description: buildContentIssueDescription(payload, buildIssue),
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

export function findExistingContentIssue(issues = []) {
  return issues.find((issue) => issue.title?.startsWith(CONTENT_TITLE_PREFIX)) || null;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeLeadPayload(payload = {}) {
  return {
    name: normalizeString(payload.name),
    email: normalizeString(payload.email),
    phone: normalizeString(payload.phone),
    trade: normalizeString(payload.trade),
    suburb: normalizeString(payload.suburb),
    package: normalizeString(payload.package),
    message: normalizeString(payload.message),
    source: normalizeString(payload.source) || "landing_page_form"
  };
}

export function normalizeFormspreeWebhookPayload(payload = {}) {
  const submission = payload?.submission ?? {};

  return normalizeLeadPayload({
    name: submission.name,
    email: submission.email,
    phone: submission.phone,
    trade: submission.trade,
    suburb: submission.suburb,
    package: submission.package,
    message: submission.message,
    source: payload.form ? `formspree:${payload.form}` : "formspree"
  });
}

export function validateLeadPayload(payload = {}) {
  const value = normalizeLeadPayload(payload);
  const errors = [];

  if (!value.name) {
    errors.push("name is required");
  }

  if (!value.email) {
    errors.push("email is required");
  } else if (!isValidEmail(value.email)) {
    errors.push("email must be a valid email address");
  }

  if (!value.trade) {
    errors.push("trade is required");
  }

  return {
    ok: errors.length === 0,
    errors,
    value
  };
}

export function buildLeadIssueTitle(payload) {
  return `New Lead: ${payload.name} (${payload.trade})`;
}

export function buildLeadIssueDescription(payload) {
  return [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || "Not provided"}`,
    `Trade: ${payload.trade}`,
    `Suburb: ${payload.suburb || "Not provided"}`,
    `Package: ${payload.package || "Not provided"}`,
    `Source: ${payload.source}`,
    `Message: ${payload.message || "No message"}`
  ].join("\n");
}

export function buildLeadIssuePayload(payload, config = {}) {
  const issue = {
    title: buildLeadIssueTitle(payload),
    description: buildLeadIssueDescription(payload),
    priority: "high"
  };

  if (config.assigneeAgentId) {
    issue.assigneeAgentId = config.assigneeAgentId;
  }

  if (config.projectId) {
    issue.projectId = config.projectId;
  }

  return issue;
}

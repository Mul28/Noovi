export const REQUIRED_FIELDS = [
  "business_name",
  "contact_name",
  "contact_email",
  "primary_trade",
  "main_suburb",
  "service_areas",
  "core_services",
  "website_goal",
  "package_selected",
  "launch_option"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeIntakePayload(payload = {}) {
  return {
    business_name: normalizeString(payload.business_name),
    contact_name: normalizeString(payload.contact_name),
    contact_email: normalizeString(payload.contact_email),
    contact_phone: normalizeString(payload.contact_phone),
    display_phone: normalizeString(payload.display_phone),
    display_email: normalizeString(payload.display_email),
    primary_trade: normalizeString(payload.primary_trade),
    secondary_trade: normalizeString(payload.secondary_trade),
    main_suburb: normalizeString(payload.main_suburb),
    state: normalizeString(payload.state),
    service_areas: normalizeStringArray(payload.service_areas),
    years_in_business: normalizeString(payload.years_in_business),
    licence_details: normalizeString(payload.licence_details),
    business_description: normalizeString(payload.business_description),
    differentiators: normalizeString(payload.differentiators),
    customer_type: normalizeString(payload.customer_type),
    core_services: normalizeStringArray(payload.core_services),
    after_hours_available: Boolean(payload.after_hours_available),
    service_mix: normalizeString(payload.service_mix),
    priority_services: normalizeStringArray(payload.priority_services),
    website_goal: normalizeString(payload.website_goal),
    need_domain_help: Boolean(payload.need_domain_help),
    need_hosting_included: Boolean(payload.need_hosting_included),
    logo_url: normalizeString(payload.logo_url),
    photo_urls: normalizeStringArray(payload.photo_urls),
    brand_colours: normalizeStringArray(payload.brand_colours),
    existing_website_url: normalizeString(payload.existing_website_url),
    google_business_profile_url: normalizeString(payload.google_business_profile_url),
    jobs_completed: normalizeString(payload.jobs_completed),
    guarantees: normalizeString(payload.guarantees),
    awards_or_memberships: normalizeStringArray(payload.awards_or_memberships),
    client_testimonials: normalizeStringArray(payload.client_testimonials),
    tone_preference: normalizeString(payload.tone_preference),
    reference_websites: normalizeStringArray(payload.reference_websites),
    wording_to_avoid: normalizeString(payload.wording_to_avoid),
    mandatory_wording: normalizeString(payload.mandatory_wording),
    package_selected: normalizeString(payload.package_selected),
    domain_name: normalizeString(payload.domain_name),
    launch_option: normalizeString(payload.launch_option),
    form_destination_email: normalizeString(payload.form_destination_email)
  };
}

export function validateIntakePayload(payload = {}) {
  const value = normalizeIntakePayload(payload);
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    const fieldValue = value[field];
    const isMissing = Array.isArray(fieldValue) ? fieldValue.length === 0 : !fieldValue;
    if (isMissing) {
      errors.push(`${field} is required`);
    }
  }

  if (value.contact_email && !isValidEmail(value.contact_email)) {
    errors.push("contact_email must be a valid email address");
  }

  if (value.display_email && !isValidEmail(value.display_email)) {
    errors.push("display_email must be a valid email address");
  }

  if (value.form_destination_email && !isValidEmail(value.form_destination_email)) {
    errors.push("form_destination_email must be a valid email address");
  }

  if (value.launch_option === "custom_domain" && !value.domain_name) {
    errors.push("domain_name is required when launch_option is custom_domain");
  }

  return {
    ok: errors.length === 0,
    errors,
    value
  };
}

export function buildBuildIssueTitle(payload) {
  return `BUILD: ${payload.business_name} - ${payload.primary_trade}`;
}

export function buildBuildIssueDescription(payload) {
  return [
    `Business Name: ${payload.business_name}`,
    `Contact Name: ${payload.contact_name}`,
    `Contact Email: ${payload.contact_email}`,
    `Contact Phone: ${payload.contact_phone || "Not provided"}`,
    `Primary Trade: ${payload.primary_trade}`,
    `Main Suburb: ${payload.main_suburb}`,
    `Service Areas: ${payload.service_areas.join(", ")}`,
    `Core Services: ${payload.core_services.join(", ")}`,
    `Package Selected: ${payload.package_selected}`,
    `Launch Option: ${payload.launch_option}`,
    "",
    "Build Notes:",
    `Website Goal: ${payload.website_goal}`,
    `Tone Preference: ${payload.tone_preference || "No preference supplied"}`,
    `Need Hosting Included: ${payload.need_hosting_included ? "Yes" : "No"}`,
    `Need Domain Help: ${payload.need_domain_help ? "Yes" : "No"}`,
    `Domain Name: ${payload.domain_name || "Not provided"}`,
    "",
    "Intake Payload:",
    "```json",
    JSON.stringify(payload, null, 2),
    "```"
  ].join("\n");
}

export function buildBuildIssuePayload(payload, config = {}) {
  const issue = {
    title: buildBuildIssueTitle(payload),
    description: buildBuildIssueDescription(payload)
  };

  if (config.assigneeAgentId) {
    issue.assigneeAgentId = config.assigneeAgentId;
  }

  if (config.projectId) {
    issue.projectId = config.projectId;
  }

  return issue;
}

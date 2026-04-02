const form = document.getElementById("intake-form");
const statusEl = document.getElementById("form-status");
const launchOptionEl = document.getElementById("launch-option");
const domainFieldEl = document.getElementById("domain-name-field");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ` ${type}` : ""}`;
}

function normalizeMultiline(value) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleDomainField() {
  const needsDomain = launchOptionEl.value === "custom_domain";
  domainFieldEl.classList.toggle("hidden", !needsDomain);
}

function serializeForm(formData) {
  return {
    business_name: (formData.get("business_name") || "").toString().trim(),
    contact_name: (formData.get("contact_name") || "").toString().trim(),
    contact_email: (formData.get("contact_email") || "").toString().trim(),
    contact_phone: (formData.get("contact_phone") || "").toString().trim(),
    display_phone: (formData.get("display_phone") || "").toString().trim(),
    display_email: (formData.get("display_email") || "").toString().trim(),
    primary_trade: (formData.get("primary_trade") || "").toString().trim(),
    secondary_trade: (formData.get("secondary_trade") || "").toString().trim(),
    main_suburb: (formData.get("main_suburb") || "").toString().trim(),
    state: (formData.get("state") || "").toString().trim(),
    service_areas: normalizeMultiline((formData.get("service_areas") || "").toString()),
    years_in_business: (formData.get("years_in_business") || "").toString().trim(),
    licence_details: (formData.get("licence_details") || "").toString().trim(),
    business_description: (formData.get("business_description") || "").toString().trim(),
    differentiators: (formData.get("differentiators") || "").toString().trim(),
    customer_type: (formData.get("customer_type") || "").toString().trim(),
    core_services: normalizeMultiline((formData.get("core_services") || "").toString()),
    after_hours_available: formData.get("after_hours_available") === "on",
    service_mix: (formData.get("service_mix") || "").toString().trim(),
    priority_services: normalizeMultiline((formData.get("priority_services") || "").toString()),
    website_goal: (formData.get("website_goal") || "").toString().trim(),
    need_domain_help: formData.get("need_domain_help") === "on",
    need_hosting_included: formData.get("need_hosting_included") === "on",
    logo_url: (formData.get("logo_url") || "").toString().trim(),
    photo_urls: normalizeMultiline((formData.get("photo_urls") || "").toString()),
    brand_colours: [],
    existing_website_url: (formData.get("existing_website_url") || "").toString().trim(),
    google_business_profile_url: (formData.get("google_business_profile_url") || "").toString().trim(),
    jobs_completed: (formData.get("jobs_completed") || "").toString().trim(),
    guarantees: (formData.get("guarantees") || "").toString().trim(),
    awards_or_memberships: normalizeMultiline((formData.get("awards_or_memberships") || "").toString()),
    client_testimonials: normalizeMultiline((formData.get("client_testimonials") || "").toString()),
    tone_preference: (formData.get("tone_preference") || "").toString().trim(),
    reference_websites: normalizeMultiline((formData.get("reference_websites") || "").toString()),
    wording_to_avoid: (formData.get("wording_to_avoid") || "").toString().trim(),
    mandatory_wording: (formData.get("mandatory_wording") || "").toString().trim(),
    package_selected: (formData.get("package_selected") || "").toString().trim(),
    domain_name: (formData.get("domain_name") || "").toString().trim(),
    launch_option: (formData.get("launch_option") || "").toString().trim(),
    form_destination_email: (formData.get("form_destination_email") || "").toString().trim()
  };
}

launchOptionEl.addEventListener("change", toggleDomainField);
toggleDomainField();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Submitting your website brief...");

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    const payload = serializeForm(new FormData(form));
    const response = await fetch("/api/intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(result.errors)
        ? result.errors.join(" ")
        : result.error || "Could not submit the form.";
      throw new Error(errorMessage);
    }

    form.reset();
    toggleDomainField();
    setStatus(
      result.dryRun
        ? "Form accepted. BUILD issue payload generated in dry-run mode."
        : "Thanks. Your website brief has been received and moved into build.",
      "success"
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not submit the form.", "error");
  } finally {
    button.disabled = false;
  }
});

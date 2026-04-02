import { describe, expect, it } from "vitest";

import {
  buildBuildIssuePayload,
  buildBuildIssueTitle,
  validateIntakePayload
} from "../intake-form/lib/intake.mjs";

describe("validateIntakePayload", () => {
  it("accepts a valid intake payload", () => {
    const result = validateIntakePayload({
      business_name: "Smith Plumbing",
      contact_name: "Sam Smith",
      contact_email: "sam@smithplumbing.com.au",
      primary_trade: "Plumber",
      main_suburb: "Marrickville",
      service_areas: ["Marrickville", "Newtown"],
      core_services: ["Blocked drains", "Hot water", "Leak repairs"],
      website_goal: "more_quote_requests",
      package_selected: "build_plus_hosting",
      launch_option: "noovi_subdomain"
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("requires a domain name for custom domains", () => {
    const result = validateIntakePayload({
      business_name: "Smith Plumbing",
      contact_name: "Sam Smith",
      contact_email: "sam@smithplumbing.com.au",
      primary_trade: "Plumber",
      main_suburb: "Marrickville",
      service_areas: ["Marrickville"],
      core_services: ["Blocked drains"],
      website_goal: "more_quote_requests",
      package_selected: "build_only",
      launch_option: "custom_domain"
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("domain_name is required when launch_option is custom_domain");
  });
});

describe("build issue mapping", () => {
  it("builds a deterministic BUILD issue payload", () => {
    const payload = {
      business_name: "Smith Plumbing",
      contact_name: "Sam Smith",
      contact_email: "sam@smithplumbing.com.au",
      contact_phone: "",
      display_phone: "",
      display_email: "",
      primary_trade: "Plumber",
      secondary_trade: "",
      main_suburb: "Marrickville",
      state: "NSW",
      service_areas: ["Marrickville", "Newtown"],
      years_in_business: "",
      licence_details: "",
      business_description: "",
      differentiators: "",
      customer_type: "",
      core_services: ["Blocked drains", "Hot water", "Leak repairs"],
      after_hours_available: false,
      service_mix: "",
      priority_services: [],
      website_goal: "more_quote_requests",
      need_domain_help: false,
      need_hosting_included: true,
      logo_url: "",
      photo_urls: [],
      brand_colours: [],
      existing_website_url: "",
      google_business_profile_url: "",
      jobs_completed: "",
      guarantees: "",
      awards_or_memberships: [],
      client_testimonials: [],
      tone_preference: "straightforward",
      reference_websites: [],
      wording_to_avoid: "",
      mandatory_wording: "",
      package_selected: "build_plus_hosting",
      domain_name: "",
      launch_option: "noovi_subdomain",
      form_destination_email: ""
    };

    expect(buildBuildIssueTitle(payload)).toBe("BUILD: Smith Plumbing - Plumber");

    const issue = buildBuildIssuePayload(payload, {
      assigneeAgentId: "delivery-agent-id",
      projectId: "project-id"
    });

    expect(issue.title).toBe("BUILD: Smith Plumbing - Plumber");
    expect(issue.assigneeAgentId).toBe("delivery-agent-id");
    expect(issue.projectId).toBe("project-id");
    expect(issue.description).toContain("Intake Payload:");
    expect(issue.description).toContain("\"business_name\": \"Smith Plumbing\"");
  });
});

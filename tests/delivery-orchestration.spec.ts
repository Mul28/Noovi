import { describe, expect, it } from "vitest";

function extractJsonBlock(description: string) {
  const match = description.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) {
    throw new Error("No JSON block found");
  }

  return JSON.parse(match[1]);
}

describe("BUILD issue payload format", () => {
  it("contains a parseable intake payload for delivery automation", () => {
    const description = [
      "Business Name: Smith Plumbing",
      "",
      "Intake Payload:",
      "```json",
      JSON.stringify(
        {
          business_name: "Smith Plumbing",
          contact_email: "sam@smithplumbing.com.au",
          primary_trade: "Plumber",
          main_suburb: "Marrickville",
          service_areas: ["Marrickville", "Newtown"],
          core_services: ["Blocked drains", "Hot water", "Leak repairs"],
          package_selected: "build_plus_hosting",
          launch_option: "noovi_subdomain"
        },
        null,
        2
      ),
      "```"
    ].join("\n");

    const payload = extractJsonBlock(description);

    expect(payload.business_name).toBe("Smith Plumbing");
    expect(payload.service_areas).toEqual(["Marrickville", "Newtown"]);
    expect(payload.launch_option).toBe("noovi_subdomain");
  });
});

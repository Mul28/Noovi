import { describe, expect, it } from "vitest";
import { parseLead } from "../src/lib/parseLead.js";

describe("parseLead", () => {
  it("extracts lead fields from a Paperclip issue description", () => {
    const lead = parseLead(`Name: Test Tradie
Email: test@example.com
Trade: Plumber
Message: Need a website
Preview URL: https://preview.noovi.com.au/test`);

    expect(lead).toEqual({
      name: "Test Tradie",
      email: "test@example.com",
      trade: "Plumber",
      message: "Need a website",
      previewUrl: "https://preview.noovi.com.au/test"
    });
  });

  it("drops unusable email placeholders", () => {
    const lead = parseLead(`Name: Unknown
Email: No email`);

    expect(lead.email).toBe("");
  });
});

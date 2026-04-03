import { describe, expect, it } from "vitest";

import {
  parseStructuredContent,
  pickLatestContentComment,
  renderPreviewHtml
} from "../intake-form/lib/preview.mjs";

describe("preview rendering helpers", () => {
  const commentBody = `Website copy completed for Smith Plumbing.

**Hero headline:** Local Plumbing in Marrickville

**Hero subheadline:** Fast, tidy plumbing for homes across Marrickville and Newtown.

**Services section:**
- Blocked drains
- Hot water systems
- Leak repairs

**About section:**
Owner-operated local plumber with 12 years experience.

**Trust section:**
- Licensed and insured
- 500+ jobs completed

**Testimonials section:**
- [PLACEHOLDER] Great plumber

**SEO title:** Smith Plumbing Marrickville

**SEO meta description:** Local plumber in Marrickville.`;

  it("parses structured content sections from the CONTENT comment", () => {
    const parsed = parseStructuredContent(commentBody);

    expect(parsed.heroHeadline).toBe("Local Plumbing in Marrickville");
    expect(parsed.services).toEqual(["Blocked drains", "Hot water systems", "Leak repairs"]);
    expect(parsed.trust).toEqual(["Licensed and insured", "500+ jobs completed"]);
    expect(parsed.seoTitle).toBe("Smith Plumbing Marrickville");
  });

  it("picks the newest structured CONTENT comment", () => {
    const comment = pickLatestContentComment([
      { body: "Older note" },
      { body: commentBody }
    ]);

    expect(comment?.body).toBe(commentBody);
  });

  it("renders an HTML preview from the build and content data", () => {
    const html = renderPreviewHtml({
      buildIssue: { identifier: "NOO-44" },
      payload: {
        business_name: "Smith Plumbing",
        primary_trade: "Plumber",
        main_suburb: "Marrickville",
        service_areas: ["Marrickville", "Newtown"],
        core_services: ["Blocked drains", "Hot water systems"],
        business_description: "",
        display_phone: "0400 111 222",
        display_email: "hello@smithplumbing.com.au",
        contact_phone: "0400 111 222",
        contact_email: "hello@smithplumbing.com.au"
      },
      previewUrl: "https://preview.noovi.com.au/preview/NOO-44",
      contentIssue: { identifier: "NOO-45" },
      contentComment: { body: commentBody }
    });

    expect(html).toContain("Local Plumbing in Marrickville");
    expect(html).toContain("Blocked drains");
    expect(html).toContain("https://preview.noovi.com.au/preview/NOO-44");
    expect(html).toContain("Smith Plumbing");
  });
});

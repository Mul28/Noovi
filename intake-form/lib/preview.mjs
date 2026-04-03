function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function extractLabeledSection(body, label) {
  const pattern = new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*[^\\n]+:\\*\\*|$)`, "i");
  const match = body.match(pattern);
  return match ? match[1].trim() : "";
}

function splitBullets(section) {
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}

function renderParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\r?\n/g, "<br>")}</p>`)
    .join("\n");
}

function renderList(items) {
  if (!items.length) {
    return "<p>Content not available yet.</p>";
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function pickLatestContentComment(comments = []) {
  return (
    [...comments]
      .reverse()
      .find((comment) => /\*\*Hero headline:\*\*/i.test(comment.body || "")) || null
  );
}

export function parseStructuredContent(commentBody = "") {
  return {
    heroHeadline: extractLabeledSection(commentBody, "Hero headline"),
    heroSubheadline: extractLabeledSection(commentBody, "Hero subheadline"),
    services: splitBullets(extractLabeledSection(commentBody, "Services section")),
    about: extractLabeledSection(commentBody, "About section"),
    trust: splitBullets(extractLabeledSection(commentBody, "Trust section")),
    testimonials: splitBullets(extractLabeledSection(commentBody, "Testimonials section")),
    seoTitle: extractLabeledSection(commentBody, "SEO title"),
    seoDescription: extractLabeledSection(commentBody, "SEO meta description")
  };
}

export function renderPreviewHtml({ buildIssue, payload, previewUrl, contentIssue, contentComment }) {
  const sections = parseStructuredContent(contentComment?.body || "");
  const services = sections.services.length ? sections.services : payload.core_services || [];
  const trust = sections.trust.length
    ? sections.trust
    : [
        payload.licence_details || payload.mandatory_wording,
        payload.years_in_business ? `${payload.years_in_business} years in business` : "",
        payload.jobs_completed ? `${payload.jobs_completed} jobs completed` : ""
      ].filter(Boolean);

  const testimonials = sections.testimonials;
  const contactItems = [
    payload.display_phone || payload.contact_phone,
    payload.display_email || payload.contact_email,
    payload.main_suburb
  ].filter(Boolean);

  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(sections.seoTitle || `${payload.business_name} Preview`)}</title>
    <meta name="description" content="${escapeHtml(sections.seoDescription || `Preview for ${payload.business_name}`)}">
    <style>
      :root {
        --ink: #1e1f1a;
        --muted: #5f5b50;
        --paper: #f6efe1;
        --panel: #fff9ef;
        --line: #dbcdb1;
        --brand: #9a4d21;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(154, 77, 33, 0.12), transparent 30%),
          linear-gradient(180deg, #fbf5ea 0%, var(--paper) 100%);
      }
      .wrap { width: min(1100px, calc(100% - 32px)); margin: 0 auto; }
      header {
        padding: 20px 0 12px;
        border-bottom: 1px solid rgba(30,31,26,0.08);
        font-family: Arial, sans-serif;
        color: var(--muted);
      }
      .hero {
        padding: 72px 0 48px;
        display: grid;
        gap: 28px;
      }
      .hero h1 {
        margin: 0;
        font-size: clamp(42px, 8vw, 92px);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }
      .hero p {
        margin: 0;
        max-width: 760px;
        font-size: 22px;
        line-height: 1.55;
        color: var(--muted);
        font-family: Arial, sans-serif;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-family: Arial, sans-serif;
      }
      .meta span {
        padding: 10px 14px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255,255,255,0.72);
      }
      main {
        padding: 12px 0 80px;
        display: grid;
        gap: 22px;
      }
      section {
        background: rgba(255, 249, 239, 0.84);
        border: 1px solid rgba(30,31,26,0.08);
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 22px 40px rgba(30, 31, 26, 0.05);
      }
      h2 {
        margin: 0 0 18px;
        font-size: 32px;
      }
      p, li {
        font-family: Arial, sans-serif;
        font-size: 18px;
        line-height: 1.7;
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      .grid {
        display: grid;
        gap: 22px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
      .callout {
        border-left: 4px solid var(--brand);
        padding-left: 16px;
      }
      footer {
        padding: 24px 0 56px;
        color: var(--muted);
        font-family: Arial, sans-serif;
      }
      a { color: var(--brand); }
    </style>
  </head>
  <body>
    <header>
      <div class="wrap">
        Preview for ${escapeHtml(buildIssue.identifier)} · ${escapeHtml(contentIssue.identifier)} · ${escapeHtml(previewUrl)}
      </div>
    </header>
    <div class="wrap">
      <section class="hero">
        <div class="meta">
          <span>${escapeHtml(payload.primary_trade)}</span>
          <span>${escapeHtml(payload.main_suburb)}</span>
          <span>${escapeHtml((payload.service_areas || []).join(", "))}</span>
        </div>
        <div>
          <h1>${escapeHtml(sections.heroHeadline || `${payload.business_name} Website Preview`)}</h1>
          <p>${escapeHtml(sections.heroSubheadline || payload.business_description || "Preview content is being prepared.")}</p>
        </div>
        <div class="meta">
          ${contactItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>
      <main>
        <div class="grid">
          <section>
            <h2>Services</h2>
            ${renderList(services)}
          </section>
          <section>
            <h2>Trust</h2>
            ${renderList(trust)}
          </section>
        </div>
        <section>
          <h2>About</h2>
          ${renderParagraphs(sections.about || payload.business_description || "Business background coming soon.")}
        </section>
        <section>
          <h2>Testimonials</h2>
          ${renderList(testimonials)}
        </section>
        <section class="callout">
          <h2>Preview Notes</h2>
          <p>This is a deterministic Noovi preview generated from the structured intake payload and the completed CONTENT issue. Share this URL for review, revisions, and go-live handoff.</p>
        </section>
      </main>
      <footer>
        Generated for ${escapeHtml(payload.business_name)} from ${escapeHtml(buildIssue.identifier)} and ${escapeHtml(contentIssue.identifier)}.
      </footer>
    </div>
  </body>
</html>`;
}

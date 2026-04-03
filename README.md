# Noovi Head of Growth Tools

This package provides deterministic worker actions for Noovi's `Head of Growth`.

Available actions:

- `send_welcome_email_for_issue(issueId)`
- `send_intake_reminder_email_for_issue(issueId)`
- `send_preview_ready_email_for_issue(issueId)`

Each action is designed to:

1. fetch a Paperclip issue
2. parse lead data from the issue description
3. send a Noovi email through the local email service
4. write the outcome back to the issue as a comment

Expected issue fields:

- `Name`
- `Email`
- `Trade`
- `Message`
- `Preview URL` for preview-ready emails

Required environment variables:

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_RUN_ID` (recommended for comment traceability)
- `INTAKE_FORM_URL`
- `EMAIL_FROM_NAME` (optional, defaults to `Noovi`)

Local development commands:

```bash
npm install
npm run build
npm run typecheck
npm test
```

Recommended next live steps:

1. register the worker in Paperclip once board-level access is available
2. update `Head of Growth` to call worker actions instead of improvising shell commands
3. replace the temporary intake URL with a dedicated client brief form

## Intake Form

This repo now includes a standalone intake form app in `intake-form/`.

What it does:

- serves a dedicated client brief form
- validates required intake fields
- converts a valid submission into a deterministic `BUILD` issue payload
- can create the `BUILD` issue directly in Paperclip when the required env vars are present

Run it locally:

```bash
npm run intake:start
```

Optional environment variables for live Paperclip issue creation:

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_COMPANY_ID`
- `PAPERCLIP_PROJECT_ID`
- `HEAD_OF_DELIVERY_AGENT_ID`
- `HEAD_OF_GROWTH_AGENT_ID`

Without those values, the form still works in dry-run mode and returns the generated `BUILD` issue payload instead of posting it.

## Lead Ingest Bridge

The same intake server also supports deterministic top-of-funnel lead capture.

Routes:

- `POST /api/lead`
- `POST /api/formspree/webhook`

Use `POST /api/formspree/webhook` as the bridge for the current `noovi.com.au` landing-page form, which posts to Formspree. A valid webhook submission becomes a real `New Lead: ...` issue in Paperclip, assigned to `Head of Growth` and attached to the configured project.

If `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, and `INTAKE_FORM_URL` are set, the lead bridge also sends the welcome email directly and logs the result on the created issue before handing the lead back to `Head of Growth`.

## Deterministic Delivery Workflow

The repo now includes deterministic review-stage orchestration alongside the earlier `BUILD -> CONTENT` handoff.

Available delivery scripts:

- `node skills/noovi-delivery-orchestration/scripts/create_content_issue.mjs --issue-id "$PAPERCLIP_TASK_ID"`
- `node skills/noovi-delivery-orchestration/scripts/create_review_issue.mjs --content-issue-id "$PAPERCLIP_TASK_ID"`
- `node skills/noovi-delivery-orchestration/scripts/record_review_decision.mjs --review-issue-id "<id>" --decision changes_requested --requested-changes "..."` 
- `node skills/noovi-delivery-orchestration/scripts/record_review_decision.mjs --review-issue-id "<id>" --decision approved --payment-confirmed true`
- `node skills/noovi-delivery-orchestration/scripts/complete_revision_issue.mjs --revision-issue-id "<id>"`
- `node skills/noovi-delivery-orchestration/scripts/complete_golive_issue.mjs --golive-issue-id "<id>" --live-url "https://..."`

Live preview route:

- `GET /preview/:buildIdentifier`

Live workflow routes:

- `POST /api/review/from-content`
- `POST /api/review-decision`
- `POST /api/revision/complete`
- `POST /api/golive/complete`

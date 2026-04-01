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

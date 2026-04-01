# Noovi Head of Growth Tools

This scaffold provides a deterministic worker for Noovi's `Head of Growth`.

Primary action:

- `send_welcome_email_for_issue(issueId)`

It is designed to:

1. fetch a Paperclip issue
2. parse lead data from the issue description
3. send the standard Noovi welcome email through the local email service
4. write the outcome back to the issue as a comment

Required environment variables:

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_RUN_ID` (recommended for comment traceability)
- `INTAKE_FORM_URL`

Local development commands:

```bash
npm install
npm run build
npm test
```

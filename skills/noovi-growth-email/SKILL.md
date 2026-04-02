---
name: noovi-growth-email
description: Deterministic Noovi lead-email handling for Paperclip issues. Use when Head of Growth needs to send a welcome email, intake reminder, or preview-ready email from issue data without improvising shell commands, browsing the filesystem, or manually composing API calls.
---

# Noovi Growth Email

Use this skill when a Noovi growth workflow needs to send an outbound client email from a Paperclip issue.

The skill is designed for the Noovi zero-contact model:

- no phone calls
- no meetings
- no Calendly
- all communication handled by email

## Quick Start

Use the bundled script instead of composing your own shell, curl, or Python flow.

```bash
node scripts/send_issue_email.mjs --issue-id "$PAPERCLIP_TASK_ID" --email-type welcome
```

Supported email types:

- `welcome`
- `intake_reminder`
- `preview_ready`

If you need the details for each type, read `references/email-types.md`.

## Required Inputs

The script expects:

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_RUN_ID` for comment traceability when available
- `INTAKE_FORM_URL`

Optional:

- `EMAIL_FROM_NAME` defaults to `Noovi`

Issue description fields supported:

- `Name`
- `Email`
- `Trade`
- `Message`
- `Preview URL` for preview-ready emails

## Workflow

1. Identify the issue id.
2. Choose the email type.
3. Run the script once.
4. Read the JSON result.
5. Stop.

The script handles:

- fetching the issue
- parsing the lead
- sending through the local Noovi mail service
- posting the result back to the issue

## Commands

Welcome email:

```bash
node scripts/send_issue_email.mjs --issue-id "$PAPERCLIP_TASK_ID" --email-type welcome
```

Intake reminder:

```bash
node scripts/send_issue_email.mjs --issue-id "$PAPERCLIP_TASK_ID" --email-type intake_reminder
```

Preview-ready email:

```bash
node scripts/send_issue_email.mjs --issue-id "$PAPERCLIP_TASK_ID" --email-type preview_ready
```

## Rules

- Never improvise replacement shell commands for email sending.
- Never claim an email was sent unless the script returns success.
- Never skip the script and write the issue comment manually.
- Never use this skill for unrelated filesystem exploration.
- For preview emails, ensure the issue contains `Preview URL` before running the script.

## When It Fails

If the script returns an error:

1. trust the returned error message
2. confirm the issue comment was posted
3. stop and surface the blocker

Do not retry repeatedly in the same run unless there is a clear transient failure and new information.

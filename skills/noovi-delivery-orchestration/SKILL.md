# Noovi Delivery Orchestration

Use this skill when `Head of Delivery` needs deterministic issue handoffs instead of improvising them.

## Available scripts

- `scripts/create_content_issue.mjs`
- `scripts/create_review_issue.mjs`
- `scripts/record_review_decision.mjs`
- `scripts/complete_revision_issue.mjs`
- `scripts/complete_golive_issue.mjs`

## Purpose

These scripts:

1. reads a validated `BUILD` issue
2. extracts the intake payload from the issue description
3. validates required delivery fields
4. creates a `CONTENT: [Business Name] - [Trade]` child issue
5. assigns it to `Content Lead`
6. creates a deterministic preview/review handoff from completed `CONTENT`
7. records revision requests and go-live transitions without improvising state changes
8. comments back on the relevant issues with the handoff result

## Required environment

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_COMPANY_ID`
- `HEAD_OF_GROWTH_AGENT_ID`
- `CONTENT_LEAD_AGENT_ID`
- optional:
  - `PAPERCLIP_RUN_ID`
  - `PREVIEW_BASE_URL`

## Usage

```bash
node skills/noovi-delivery-orchestration/scripts/create_content_issue.mjs --issue-id "$PAPERCLIP_TASK_ID"
```

```bash
node skills/noovi-delivery-orchestration/scripts/create_review_issue.mjs --content-issue-id "$PAPERCLIP_TASK_ID"
```

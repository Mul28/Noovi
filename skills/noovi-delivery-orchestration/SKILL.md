# Noovi Delivery Orchestration

Use this skill when `Head of Delivery` needs deterministic issue handoffs instead of improvising them.

## Available script

- `scripts/create_content_issue.mjs`

## Purpose

This script:

1. reads a validated `BUILD` issue
2. extracts the intake payload from the issue description
3. validates required delivery fields
4. creates a `CONTENT: [Business Name] - [Trade]` child issue
5. assigns it to `Content Lead`
6. comments back on the `BUILD` issue with the handoff result

## Required environment

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_COMPANY_ID`
- `CONTENT_LEAD_AGENT_ID`
- optional:
  - `PAPERCLIP_RUN_ID`

## Usage

```bash
node skills/noovi-delivery-orchestration/scripts/create_content_issue.mjs --issue-id "$PAPERCLIP_TASK_ID"
```

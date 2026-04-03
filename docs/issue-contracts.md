# Noovi Issue Contracts

This document defines the canonical issue flow for Noovi.

## Lead States

- `new`
- `nurturing`
- `intake_requested`
- `intake_received`
- `in_build`
- `in_review`
- `awaiting_payment`
- `live`
- `cold`

## Issue Types

### Lead Issue

Title example:
`New Lead: Smith Plumbing (Plumber)`

Required fields:

- name
- email
- trade
- message

### BUILD

Title:
`BUILD: [Business Name] - [Trade]`

Required fields:

- business name
- trade
- contact email
- main suburb
- service areas
- package selected
- launch option
- intake payload

Output:

- `CONTENT` issue if copy is needed
- preview-ready handoff back to `Head of Growth`

Creation rule:

- valid intake submissions must create `BUILD` deterministically through the bridge
- the bridge must also create or reuse a child `CONTENT` issue and mark `BUILD` `in_progress`

### CONTENT

Title:
`CONTENT: [Business Name] - [Trade]`

Required fields:

- intake payload
- content brief
- page structure needed

Output:

- structured copy sections
- seo title
- seo meta description
- placeholder testimonials clearly marked
- deterministic preview handoff to `REVIEW`

### REVIEW

Title:
`REVIEW: [Business Name]`

Required fields:

- preview URL
- checks completed
- revision count

Output:

- approval
- revision request
- payment trigger

### REVISIONS

Title:
`REVISIONS: [Business Name]`

Required fields:

- revision round
- exact change list
- current preview URL

Output:

- updated preview URL

### GOLIVE

Title:
`GOLIVE: [Business Name]`

Required fields:

- approved preview
- payment confirmed
- domain/subdomain target

Output:

- live URL
- go-live confirmation back to `Head of Growth`

## Handoff Rules

### Head of Growth -> Head of Delivery

Allowed when:

- intake is complete
- required build fields are present

Must create:

- `BUILD` issue

### Head of Delivery -> Content Lead

Allowed when:

- build needs copy generation and no child `CONTENT` issue exists

Must create:

- `CONTENT` issue

Operational note:

- the preferred unattended path is for the bridge or deterministic script to create the child `CONTENT` issue at BUILD creation time
- `Head of Delivery` should treat existing child `CONTENT` issues as canonical and must not create duplicates

### Content Lead -> Head of Delivery

Allowed when:

- structured copy is complete

Must return:

- copy sections only
- no direct client communication
- then trigger deterministic `REVIEW` creation using the orchestration script

### Head of Delivery -> Head of Growth

Allowed when:

- preview exists
- quality checks passed

Must create or update:

- `REVIEW` issue with preview URL

Operational note:

- the preferred unattended path is for a deterministic script to create or update the `REVIEW` issue from a completed `CONTENT` issue
- `Head of Growth` should treat the `REVIEW` issue as the canonical item for preview email, revision tracking, and approval

## Quality Gates

Before `REVIEW`:

- no placeholder brackets remain
- no Calendly embeds remain
- contact form configured
- links checked
- mobile layout checked

Before `GOLIVE`:

- approval confirmed
- payment confirmed
- final form check complete
- domain target confirmed

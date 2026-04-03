# Noovi Delivery Workflow

## End-To-End Sequence

1. Lead enters from landing page
2. `Head of Growth` sends welcome email
3. Lead completes intake form
4. The bridge creates `BUILD`
5. The bridge deterministically creates or reuses the child `CONTENT` issue and marks `BUILD` `in_progress`
6. `Content Lead` returns structured copy
7. A deterministic script creates or reuses the preview URL and `REVIEW` issue
8. `Head of Growth` (or the deterministic email script) sends the preview email
9. Revisions loop if needed
10. Approval triggers payment
11. Payment triggers `GOLIVE`
12. `Head of Growth` sends live email

## Deterministic Delivery Handoff

`BUILD -> CONTENT` is no longer dependent on freeform agent behavior.

When a valid intake payload is submitted:

- the bridge creates the `BUILD` issue
- the bridge posts the delivery kickoff comment
- the bridge checks for an existing child `CONTENT` issue
- if none exists, the bridge creates one and assigns it to `Content Lead`
- the bridge marks the `BUILD` issue `in_progress`

This prevents unattended runs from stalling at the `BUILD` stage because `Head of Delivery` failed to create the child `CONTENT` issue.

## Deterministic Preview Handoff

`CONTENT -> REVIEW` now has a deterministic path too.

When a `CONTENT` issue is complete:

- the preview URL is derived from the stable pattern `/preview/:buildIdentifier`
- the orchestration script creates or reuses the child `REVIEW` issue
- the `REVIEW` issue stores the preview URL, current revision round, and source issue links
- the system can then deterministically create `REVISIONS` or `GOLIVE` issues from the `REVIEW` decision

## Build Gate Checklist

`Head of Delivery` should not start a true build until:

- intake payload exists
- business name is known
- trade is known
- contact email is known
- main suburb is known
- launch option is known

## Content Gate Checklist

`Content Lead` should not return copy unless:

- services are specific
- suburb/service area is reflected
- tone is Australian English
- CTA language is quote/enquiry based
- testimonials are marked `[PLACEHOLDER]` if synthetic

## Review Gate Checklist

`Head of Delivery` should not mark preview ready unless:

- copy inserted
- logo and images applied if available
- all placeholders removed
- contact form configured
- no Calendly or call-booking elements remain
- mobile layout checked

## Go-Live Gate Checklist

Do not launch unless:

- preview approved
- payment confirmed
- domain or subdomain target confirmed
- final contact form test completed

## Failure Handling

If intake is incomplete:

- `Head of Growth` requests missing details
- no `BUILD` issue yet

If copy is incomplete:

- `Head of Delivery` returns `CONTENT` issue with exact missing items

If preview fails QA:

- keep issue with `Head of Delivery`
- do not send to client

If payment is missing:

- do not create `GOLIVE`

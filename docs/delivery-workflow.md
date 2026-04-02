# Noovi Delivery Workflow

## End-To-End Sequence

1. Lead enters from landing page
2. `Head of Growth` sends welcome email
3. Lead completes intake form
4. `Head of Growth` creates `BUILD`
5. `Head of Delivery` reviews intake and creates `CONTENT`
6. `Content Lead` returns structured copy
7. `Head of Delivery` builds preview
8. `Head of Growth` sends review email
9. Revisions loop if needed
10. Approval triggers payment
11. Payment triggers `GOLIVE`
12. `Head of Growth` sends live email

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

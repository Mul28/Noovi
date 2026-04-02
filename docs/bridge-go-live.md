# Noovi Bridge Go-Live

This repo now contains a deploy-ready lead and intake bridge for Noovi.

## What It Hosts

- `/start`
  - the real intake form
- `/api/lead`
  - direct lead capture endpoint
- `/api/formspree/webhook`
  - webhook endpoint for the current landing-page Formspree flow
- `/api/intake`
  - structured intake-to-BUILD endpoint

## Recommended Deployment Target

Use Netlify first.

Why:

- `noovi.com.au` already runs on Netlify
- this repo now includes `netlify.toml`
- the intake form is static
- the bridge API is implemented as a Netlify function

## Recommended Live URLs

- Intake form:
  - `https://start.noovi.com.au/start`
  - or `https://noovi-intake.netlify.app/start`
- Formspree webhook target:
  - `https://start.noovi.com.au/api/formspree/webhook`

## Required Environment Variables

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_COMPANY_ID`
- `PAPERCLIP_PROJECT_ID`
- `HEAD_OF_GROWTH_AGENT_ID`
- `HEAD_OF_DELIVERY_AGENT_ID`
- `RESEND_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `INTAKE_FORM_URL`

## Formspree Wiring

Keep the current public landing-page form if needed.

Add a Formspree webhook to:

`POST https://<bridge-host>/api/formspree/webhook`

Expected source form:

`https://formspree.io/f/xreogrkj`

When configured:

1. user submits `noovi.com.au` landing-page form
2. Formspree receives submission
3. Formspree forwards webhook payload to the bridge
4. bridge creates `New Lead: ...` issue in Paperclip
5. bridge sends welcome email directly
6. result is logged on the created issue

## Intake Wiring

Set:

- `INTAKE_FORM_URL=https://<bridge-host>/start`

Update the live `Head of Growth` agent env to the same URL after deployment.

## Remaining Gap

The current public site source is not present in this repo, so the landing-page form itself was not patched here.

This bridge removes the need to patch the live site immediately, because Formspree webhooks can forward current submissions into Paperclip.

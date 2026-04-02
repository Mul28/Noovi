# Noovi Intake Form Spec

This form is the second-stage client brief for Noovi.

Do not use the landing-page enquiry form as the long-term intake source. The landing page should capture interest. This intake form should capture everything needed to start a real build.

## Goal

Collect enough structured data for Noovi to:

1. validate the lead
2. create a `BUILD` issue without manual clarification
3. route content work to `Content Lead`
4. route build work to `Head of Delivery`
5. keep the business zero-contact

## Form Position In The Funnel

1. Prospect submits landing-page enquiry form
2. `Head of Growth` sends welcome email
3. Welcome email links to this intake form
4. Intake form submission becomes the source of truth for delivery
5. `Head of Growth` creates `BUILD: [Business Name] - [Trade]`

## Required Sections

### 1. Contact Details

- Business name
- Contact name
- Contact email
- Contact phone
- Preferred display phone on website
- Preferred display email on website

### 2. Trade And Location

- Primary trade
- Secondary trade or specialties
- Main suburb
- Service area suburbs or regions
- State

### 3. Business Profile

- Years in business
- Licence or accreditation details
- Short description of the business
- What makes the business different
- Typical customer type

### 4. Services

- Core services list
- Emergency or after-hours availability
- Residential, commercial, or both
- Top-priority services to feature

### 5. Website Goals

- Main goal:
  - more phone calls
  - more quote requests
  - more local search visibility
  - replacement of an old website
- Need domain help:
  - yes
  - no
- Need hosting included:
  - yes
  - no

### 6. Branding And Assets

- Logo upload
- Photo uploads
- Brand colours if known
- Existing website URL if any
- Existing Google Business Profile URL if any

### 7. Trust Signals

- Years in business
- Number of jobs completed or approximate volume
- Service guarantees or warranty
- Awards, memberships, or certifications
- Testimonials provided by client

### 8. Content Preferences

- Tone preference:
  - straightforward
  - premium
  - friendly
  - urgent/emergency focused
- Competitor or reference websites
- Any wording to avoid
- Any mandatory wording or compliance notes

### 9. Operational Settings

- Package selected
- Domain name to use
- Preferred launch option:
  - custom domain
  - `businessname.noovi.com.au`
- Form destination email

## Validation Rules

- `contact_email` is required and must be valid
- `business_name` is required
- `primary_trade` is required
- `main_suburb` is required
- at least 3 core services are preferred
- if `launch_option = custom_domain`, domain value is required
- uploaded assets are optional, but missing assets should be flagged in the `BUILD` issue

## Output Contract

An intake submission should map directly into a `BUILD` issue payload.

Minimum fields required for build start:

- `business_name`
- `contact_name`
- `contact_email`
- `primary_trade`
- `main_suburb`
- `service_areas`
- `core_services`
- `website_goal`
- `package_selected`
- `launch_option`

## Recommended UX

- 1 page is acceptable if the form is well grouped
- use conditional logic for domain and hosting questions
- allow file uploads for logo and photos
- keep question labels plain and non-technical
- end with a short note:
  `We handle the whole process by email. Once this form is submitted, we'll move your website into production.`

## Suggested Submission Handling

On submit, Noovi should:

1. validate required fields
2. reject obvious test or junk submissions
3. create or update CRM lead record
4. create `BUILD: [Business Name] - [Trade]`
5. attach the intake payload to the issue description or document
6. send a confirmation email

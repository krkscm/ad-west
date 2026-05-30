# 05 - Public Gateway and Member Services

## Public Gateway Surface

### Helpdesk
- Public ticket submission route
- Internal admin management routes for triage/status updates

### Jobs
- Public active job listing
- Public application submission with optional resume upload
- Internal admin posting/application management routes

Resume constraints implemented in UI/backend flow:
- Allowed extensions: PDF, DOC, DOCX
- File size cap: 1 MB

### Event Registration
- Public event registration page with dynamic form-field rendering
- Public registration submission endpoint

### Join Us / Contact Intake
- Public contact registration page (`/join-us`) outside authenticated app shell
- Public contact registration page uses a shared public shell and grouped section cards so the intake reads as Membership, Contact, Profile, Residence, and Security blocks
- Backend endpoints:
	- `GET /api/v1/public/sreni-contacts/srenies` for active Sreni options that are explicitly enabled from Sreni CRUD Join Us visibility
	- `POST /api/v1/public/sreni-contacts/register` for submission persistence into `adwest.sreni_contacts`
- Submission payload stores normalized public-form metadata in `sreni_contacts.data` with source markers (`public-join-us-form`, `public_join_form`)
- Join Us form now keeps only the core public intake fields: Sreni, name, phone, email, city, country, notes, and a small set of contact profile fields that match current needs, arranged into labeled sections to make the form easier to scan and complete
- Anti-bot guardrails: captcha verification, hidden honeypot field validation, and route-level throttling
- Optional format validation rules:
	- `phone` accepts permissive international-style patterns (`+`, spaces, dashes, parentheses) and enforces 7-15 digits after normalization
	- `email` remains optional but must match a standard email structure when supplied
- Duplicate-contact guard: backend rejects inserts when the same Sreni already has a contact with matching normalized phone or matching email

## Member Services Surface

Member services module includes operations around:
- Reimbursements
- Special events administration
- Notifications administration

Admin workspace member-services section includes:
- Reimbursements page
- Special Events page
- Notifications page
- Gmail Workspace panel (compose + inbox preview)

## Access Model

- Public routes are intentionally open for intake use cases.
- Internal operational endpoints remain authenticated and role-scoped.
- Gmail workspace functionality additionally requires Google-authenticated admin session context.

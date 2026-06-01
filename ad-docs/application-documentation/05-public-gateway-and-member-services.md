# 05 - Public Gateway and Member Services

## Public Gateway Architecture

Public gateway routes are intentionally unauthenticated and exposed under `/api/v1/public/...`.

### Public Helpdesk

- Public submit endpoints for ticket intake
- Admin-side triage/status endpoints under `/api/v1/gateway/helpdesk/...`

### Public Jobs

- Public listing and application submission routes
- Admin CRUD/review endpoints under `/api/v1/gateway/jobs/...`
- Resume upload constraints are enforced by frontend/backend validation (type + size)

### Public Join-Us Contact Intake

- Page route: `/join-us`
- Sreni options endpoint: `GET /api/v1/public/sreni-contacts/srenies`
- Submission endpoint: `POST /api/v1/public/sreni-contacts/register`
- Submission guardrails:
  - Captcha verification
  - Honeypot field validation
  - Route-level throttling
  - Duplicate detection by normalized identity fields

### Public Event Registration

- Public route group: `/api/v1/public/events`
- Supports dynamic event-field registration payloads from frontend public event pages

## Member Services Architecture

Authenticated member-services route groups:
- `/api/v1/member-services/reimbursements`
- `/api/v1/member-services/events`
- `/api/v1/member-services/notifications`

Admin workspace surfaces include:
- Reimbursements management
- Special events management
- Notifications management
- Email workspace integration panel

## Access and Guard Model

- Public intake paths remain open by design.
- Internal operational paths are auth-guarded and role-scoped.
- Member-services and gateway admin surfaces use dedicated guard patterns for operational actions.

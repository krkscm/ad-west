# 05 - Public Gateway and Member Services

## Public gateway

Routes are **unauthenticated** under `/api/v1/public/...`. Admin operations use `/api/v1/gateway/...` with `GatewayAdminAuthGuard`.

### Public helpdesk

| Public | Admin |
|--------|-------|
| `POST /public/helpdesk` | `GET/PATCH /gateway/helpdesk/...` |

### Public jobs

| Public | Admin |
|--------|-------|
| `GET /public/jobs` | CRUD under `/gateway/jobs` |
| `POST /public/jobs/:id/apply` | Application review, status |
| Resume upload (PDF/DOC/DOCX, size limits) | `GET /gateway/jobs/applications/:id/resume` |

Job application **activity timeline** persisted in `job_application_activities` (migrations 071–072).

### Public Join Us

| Item | Detail |
|------|--------|
| Page | `/join-us` → `PublicContactRegistrationPage` |
| Sreni list | `GET /public/sreni-contacts/srenies` (respects `join_us_visible` on Sreni) |
| Submit | `POST /public/sreni-contacts/register` |
| Guards | Captcha, honeypot, throttling, duplicate detection |

Submissions create `sreni_contacts` rows with `source_file = 'public-join-us-form'` and `review_status = 'pending'` (migration 077).

### Join Us admin review

| Item | Detail |
|------|--------|
| Menu key | `governance-join-us-review` |
| Page | `/admin/general-services/join-us-review` |
| List | `GET /org/join-us-submissions` |
| Action | `POST /org/join-us-submissions/:contactId/complete-review` |

Review completion updates `review_status`, `reviewed_at`, `reviewed_by` and may trigger registry/tag side effects per service logic.

### Public event registration

- `GET /public/events/:id/registration-info`
- `POST /public/events/:id/register`
- Dynamic form fields from event definition

## Member services

Authenticated routes under `/api/v1/member-services/...` and admin management in General Services.

### Reimbursements

- Categories from enum_values
- Create via multipart: category, description (≥5 chars), amount > 0, **receipt required**
- Draft → submit → review workflow
- Admin: `/admin/general-services/reimbursements`

### Special events

- Admin CRUD for events
- Public registration per event
- Registrations list per event

### Notifications

- Admin broadcast/notification management
- Member-facing notification consumption in portal

## Guard model summary

| Surface | Guard |
|---------|-------|
| Public intake | None (throttle + validation only) |
| Gateway admin | `GatewayAdminAuthGuard` |
| Member services (member) | `MemberAuthGuard` / `CoreMemberAuthGuard` |
| Member services (admin) | `CoreAdminAuthGuard` |
| Join-us review | `CoreAdminAuthGuard` + contact scope via actor |

## Frontend surfaces

| Area | Pages |
|------|-------|
| Public | `PublicPortalPage`, `PublicHelpdeskPage`, `PublicJobsPage`, `PublicContactRegistrationPage`, `PublicEventRegistrationPage` |
| Admin gateway | `helpdesk/*`, job postings/applications |
| Admin member-services | `member-services/ReimbursementPage`, events, notifications |
| Join Us review | `JoinUsReviewPage` |

# Module 10 Acceptance Baseline: Job Board and Resume

## Status
- Deprecated and removed from active API/UI runtime in the current phase.
- DB decommission migration added: `037_remove_deprecated_jobs_resumes_and_enum_values.sql`.
- Backend runtime internals and persistence test coverage for jobs/resumes were removed from Core Business service and spec to complete decommissioning.
- Deprecated job/resume and profile edit-request DTO classes were removed from `core-business.dto.ts` to harden contract surface.

## In-Scope Capabilities
- Admin job listing creation and status lifecycle (draft, active, archived).
- Member-facing active job listing visibility.
- Member interest expression on active listings.
- Member resume upload/replace behavior.
- Admin searchable resume listing.

## Acceptance Criteria
- Admin can create and activate job listings with required job metadata.
- Members can browse active listings and express interest.
- Member resume uploads create new active version and deactivate prior active resume.
- Admin can query resumes by file metadata/skills term.

## Test Evidence Checklist
- [x] Job listing create/status update API evidence.
- [x] Member job browse and interest API evidence.
- [x] Resume upload/list API evidence.
- [x] Resume access audit log evidence.

## Implementation Evidence
- API routes added under `/api/v1/jobs/*` and `/api/v1/members/me/jobs/*`.
- Resume lifecycle and job interest logic added in core service.
- Database migration added: `ad-docs/database-script/015_document_job_approval_modules.sql`.
- Frontend API client methods added in `ad-west-web/src/utils/backendApi.ts` for jobs, interests, and resumes.
- Admin UI operations added in `ad-west-web/src/pages/AdminDashboardPage.tsx` (Ops Coverage tab).
- Member jobs and resume UI added in `ad-west-web/src/pages/MemberPortalPage.tsx` (Career and Reports section).
- Resume access audit logging implemented in `ad-west-api/src/modules/core-business/core-business.service.ts` via admin resume search/list access events.
- Audit retrieval endpoint added: `/api/v1/jobs/resume-access-logs`.


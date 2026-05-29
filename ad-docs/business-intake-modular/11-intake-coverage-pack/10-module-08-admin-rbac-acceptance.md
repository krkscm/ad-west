# Module 08 Acceptance Baseline: Admin Portal and RBAC

## In-Scope Capabilities
- Admin roles: Super Admin, Zone Admin, Sreny Admin.
- Password + captcha login with lockout controls.
- Role-scoped authenticated shell sections and actions.
- Dashboard widgets for pending approvals, tickets, programs, members, duplicate alerts.
- Audit log viewer for Zone Admin and Super Admin.
- Admin header, sidebar, and authenticated footer remain aligned in the app shell.

## Acceptance Criteria
- Only three Core Business roles are assignable.
- Role assignments support effective start date and optional end date.
- Captcha challenge is required for admin login.
- Account lockout is enforced after repeated failed login attempts.
- App shell sections and actions are restricted by role and scope.
- Dashboard shows required operational cards.
- Audit log viewer enforces authorized access.

## Exclusions to Enforce
- Custom role builder.
- Additional deferred role types.

## Current Authenticated Shell Surface
- Super Admin: dashboard, approvals, logs, ops, and all settings pages.
- Zone Admin: dashboard, approvals, logs, and ops.
- Sreny Admin: dashboard and approvals.
- Settings pages currently include roles definition, location definition, Sreni definition, permissions, permission sets, users, approval workflows, attendance metrics, and report metrics.
- Attendance metrics configuration should follow the same user-friendly interaction pattern as report metrics configuration.
- Sreni-specific calendar, contacts, attendance, documents, and reports views are loaded dynamically from backend menu data.

## Test Evidence Checklist
- [ ] Role-permission matrix tests.
- [ ] Password+captcha success and failure-path tests.
- [ ] Dashboard visibility tests.
- [ ] Audit log access control tests.
- [ ] Settings UX consistency checks for attendance metrics vs report metrics.

## Implementation Status (2026-05-24)
- Admin JWT now carries active role assignments (role, scope, effective window) for runtime checks.
- Core admin guard enforces active role window validation on each request using token role assignments.
- Core capability boundary now enforces BRS-aligned constraints:
	- Super Admin: unrestricted core access.
	- Zone Admin: unrestricted core access within Core Business core APIs.
	- Sreny Admin: restricted to programs, registrations, attendance, and helpdesk operations.

## Implementation Evidence (2026-05-29)
- Admin Management list now supports API-backed server-side search and pagination via `GET /api/v1/admin-users/paginated`.
- Admin UI consumes paginated admin response instead of full-list client-side filtering, reducing initial list payload size.

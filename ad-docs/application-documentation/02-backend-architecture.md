# 02 - Backend Architecture

## Backend Stack

- Framework: NestJS
- Language: TypeScript
- Runtime: Node.js
- API base path: `/api/v1`
- Swagger UI: `/api/docs`

## Main Composition

`ad-west-api/src/app.module.ts` wires the major modules:
- Health module
- Core business module
- User management module
- Public gateway module
- Approval workflow definitions module
- Member services module
- Enum values module

## Module Responsibilities

### Core Business Module
Primary business orchestration, including:
- Organization hierarchy and master data
- Sreni runtime flows
- Documents, reports, and approval runtime operations
- Attendance, calendar, and operational metrics
- Dynamic Sreni menu child seeding/backfill (including `Reports` and `Analytics Studio` children)

### User Management Module
- Admin/member authentication and session verification
- Roles and menu management
- Audit logs
- Google OAuth and Gmail integration endpoints
- Google integration settings endpoint (DB-backed with env fallback resolution)

Implemented Google/Gmail routes include:
- `/api/v1/auth/google/start`
- `/api/v1/auth/google/callback`
- `/api/v1/gmail/inbox`
- `/api/v1/gmail/send`
- `/api/v1/settings/google-integration-config`

### Public Gateway Module
Unauthenticated/public flows:
- Helpdesk ticket submission
- Public jobs listing and application submission
- Public event registration

Internal authenticated gateway operations are exposed for:
- Helpdesk triage/status updates
- Job posting CRUD
- Job application review and resume retrieval

### Member Services Module
- Reimbursement workflows
- Special events administration
- Notification management

In admin workspace navigation this is grouped under `member-services`, including Gmail Workspace entry (`member-services-gmail`) backed by User Management Gmail endpoints.

## Security and Access Controls

- Auth guards enforce admin/member token validation.
- Roles guard applies role-based restrictions on protected routes.
- Public gateway endpoints intentionally bypass auth for specific public use cases.
- API bootstrap applies stricter request validation and transport headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and production `HSTS`).
- CORS origin checks are allow-list based and trimmed from configured environment origins; unknown origins are rejected.
- Request payload limits are enforced at bootstrap (`json` / `urlencoded` set to 1 MB) to reduce abuse and memory pressure risk.
- Swagger exposure is environment-aware (`ENABLE_SWAGGER=true` or non-production).
- Global throttler guard is enabled with conservative defaults, and stricter route-level limits are applied on high-risk auth/public submission endpoints.

## Backend Design Pattern Notes

- Core-business runtime orchestration is split into focused runtime/util services (access, persistence, readiness, snapshot, domain utilities).
- Public Gateway and Member Services follow conditional persistence behavior (PostgreSQL in DB mode, in-memory fallback when DB mode is disabled).
- Validation and exception filters are applied globally for API consistency.
- Responsibility chart generation is handled by a dedicated runtime service with year-based query support.
- Graceful shutdown hooks are enabled at bootstrap for safer process lifecycle handling.
- Targeted API load-test harness is available at `ad-west-api/scripts/targeted-load-test.mjs`; baseline reports are written to `ad-docs/application-documentation/08-performance-and-security-baselines.md`.

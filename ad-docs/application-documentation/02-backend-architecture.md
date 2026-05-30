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
- Sthan runtime flows (reports, expenses, and contacts ingestion/listing)
- Documents, reports, and approval runtime operations
- Attendance, calendar, and operational metrics
- Location-scoped monthly report metrics via shared report-metric definitions (`scope='location'`)
- Dynamic Sreni menu child seeding/backfill (including `Reports` and `Analytics Studio` children)

### User Management Module
- Admin/member authentication and session verification
- Roles and menu management
- Menu definitions and grants are DB-driven for sidebar access control, including Governance parent/child menus (`governance`, `insights`, `my-approvals`, `ai-chatbot`, `settings-responsibility-chart`)
- Audit logs
- Google OAuth and Gmail integration endpoints
- Google integration settings endpoint (DB-backed with env fallback resolution)
- Authenticated AI chat endpoint (`POST /api/v1/ai-chat/query`) with provider-based runtime integration (Ollama/OpenAI)

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
- Public Sreni contact registration (`GET /api/v1/public/sreni-contacts/srenies`, `POST /api/v1/public/sreni-contacts/register`) persisting to `adwest.sreni_contacts`
- Public Sreni options endpoint now enforces Sreni CRUD visibility control (`adwest.srenies.join_us_visible = true`) so only explicitly approved Srenis appear in Join Us

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
- Menu management endpoints resolve menu visibility per authenticated admin using assigned menu grants, while still returning full active menus for super admins.
- Menu visibility logic includes a DB-backed fallback for core `users` super admins (`adwest.users.is_super_admin=true`), ensuring super users always receive full menu catalog even when role-string variants differ.
- Governance menu auto-healing enforces canonical parent/child definitions (`insights`, `my-approvals`, `ai-chatbot`, `settings-responsibility-chart`) as active entries, preventing stale inactive rows from hiding navigation items.
- For backward compatibility with existing admin grants, principals granted the `governance` parent implicitly receive `ai-chatbot` visibility even if the child key was not yet explicitly assigned.
- `GET /api/v1/menu-items` supports an admin-control scope (`scope=all`) so super-admin screens can load the full menu catalog while normal sidebar reads remain grant-filtered.
- Public gateway endpoints intentionally bypass auth for specific public use cases.
- Public Sreni contact registration adds layered anti-bot controls: captcha token verification, honeypot field trap, and stricter route-level throttling.
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

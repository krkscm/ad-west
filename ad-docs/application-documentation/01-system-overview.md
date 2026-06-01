# 01 - System Overview

## System Type

ADWest is a full-stack TypeScript platform composed of:
- Backend API: NestJS in `ad-west-api`
- Frontend app: React + Vite in `ad-west-web`
- Persistence: PostgreSQL via SQL migration scripts in `ad-docs/database-script`

The backend supports conditional persistence behavior:
- DB mode when `ENABLE_DB_PERSISTENCE=true`
- In-memory runtime stores for supported modules when DB mode is disabled

## User Domains

1. Admin users (governance, operations, settings)
2. Member users (member portal flows)
3. Public users (helpdesk, jobs, event registration, join-us)

## Functional Domains

- Core business operations (Sreni/Sthan, reporting, attendance, analytics)
- User and access management (auth, roles, menu visibility, sessions)
- Approval workflow definitions and governance support
- Public gateway intake (helpdesk, jobs, join-us)
- Member services (reimbursements, events, notifications)
- Integration settings and runtime services (Google OAuth config, SMTP/IMAP, AI query)

## Runtime Boundaries

- All API routes are served under `/api/v1`.
- Public flows are exposed as unauthenticated route groups by design.
- Authenticated flows are guarded with token/session/role checks.
- Frontend requests are centralized through shared API helpers and backend wrappers.

## Top-Level Runtime Model

1. Browser loads the React SPA.
2. SPA resolves route mode (public, admin, or member).
3. SPA calls REST endpoints on NestJS API (`/api/v1/...`).
4. API modules execute guarded business logic and persistence operations.
5. PostgreSQL stores runtime and configuration state when DB mode is enabled.

## Architecture Artifacts

- Primary visual diagram: `diagrams/adwest-architecture.svg`
- Details by layer are documented in chapters `02` through `07`.

# 01 - System Overview

## System type

ADWest is a full-stack TypeScript platform:

| Layer | Technology | Location |
|-------|------------|----------|
| API | NestJS, Node.js | `ad-west-api/` |
| Web | React, Vite, SCSS | `ad-west-web/` |
| Database | PostgreSQL | `ad-docs/database-script/` |

The API supports two persistence modes:

- **DB mode** (`ENABLE_DB_PERSISTENCE=true`) — PostgreSQL via TypeORM and direct SQL in runtime services
- **In-memory mode** — supported for local/dev without a database; **production startup fails** if DB mode is disabled

All HTTP APIs are served under `/api/v1`. Swagger is available at `/api/docs` when enabled.

## User domains

| Domain | Typical entry | Purpose |
|--------|---------------|---------|
| **Public** | `/`, `/helpdesk`, `/jobs`, `/join-us` | Unauthenticated intake |
| **Admin** | `/login` → `/admin/*` | Governance, Sreni/Sthan ops, settings |
| **Member** | `/login` → member portal | Reimbursements, events, notifications |

## Functional domains

### Core business (Sreni / Sthan)

- Zone → Sthan → Division location hierarchy
- Sreni definitions, divisions, calendar, attendance, documents, reports
- Analytics Studio with per-user table layouts
- Sthan reports, expenses, calendar, contacts
- Monthly report metrics and parameters

### Contact governance

- **Global contacts** — upload, search, cross-Sreni tagging, active lifecycle
- **Per-Sreni contact lists** — division/sthan assignment, household members
- **Member data upload** — Excel template with household primaries and child rows; preview/commit flow
- **Contact access scope** — data visibility by permission set and role level (ZONE / STHAN)
- **Seva Samithi** — separate registry for household primaries; memberships via `contact_sreni_tags`; seva activity log with documents
- **Gada assignment** — Gadanayak coordinators assign contacts to gadanayaks (disabled for Seva Samithi)
- **Join Us review** — public registration queue with admin approve/reject workflow

### Access and settings

- **Permissions** and **permission sets** (location + Sreni pairs)
- **Users** (`adwest.users`) — org identity, role level, sthan, permission set
- **Admin accounts** (`auth_admin_users`) — login identity and menu grants
- Role definitions, menu management, enum/reference data
- Google OAuth, SMTP/IMAP, report config, attendance metrics

### Public gateway

- Helpdesk tickets, job postings/applications (with resume upload and activity timeline)
- Join Us contact registration (captcha, honeypot, duplicate detection)

### Member services

- Reimbursements (receipt required), special events, notifications
- Public event registration

### Approvals and governance

- Approval workflow definitions (settings)
- Approval runtime items (core business)
- Responsibility chart, insights, my approvals

## Runtime boundaries

```
Browser (React SPA)
    → REST /api/v1/*
        → NestJS modules (guards, validation, services)
            → PostgreSQL (when DB mode enabled)
            → File uploads (UPLOAD_DIR)
```

- Public routes are intentionally unauthenticated.
- Admin routes use `CoreAdminAuthGuard` or module-specific admin guards.
- Member routes use `CoreMemberAuthGuard` / `MemberAuthGuard`.
- Frontend centralizes HTTP through `api.ts` and domain wrappers in `backendApi.ts`.

## Access control model (summary)

Three **orthogonal** layers:

1. **Menu grants** — which admin UI tabs an `auth_admin_users` account can see
2. **Permission sets** — which Srenis (and locations) a `users` row may access for **data**
3. **Role level** (ZONE / STHAN) — whether sthan-scoped filtering applies to contact lists

Super-admin users (`users.is_super_admin`) bypass contact scope restrictions. See chapter 04 for login paths.

## Architecture artifacts

- [diagrams/adwest-architecture.svg](./diagrams/adwest-architecture.svg)
- [diagrams/backend-contact-location-hierarchy.md](./diagrams/backend-contact-location-hierarchy.md)
- [diagrams/frontend-governance-contacts-flow.md](./diagrams/frontend-governance-contacts-flow.md)
- Chapters `02`–`07` for layer-specific detail

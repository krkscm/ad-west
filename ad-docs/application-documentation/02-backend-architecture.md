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

## Backend Design Pattern Notes

- Core-business runtime orchestration is split into focused runtime/util services (access, persistence, readiness, snapshot, domain utilities).
- Public Gateway and Member Services follow conditional persistence behavior (PostgreSQL in DB mode, in-memory fallback when DB mode is disabled).
- Validation and exception filters are applied globally for API consistency.
- Responsibility chart generation is handled by a dedicated runtime service with year-based query support.

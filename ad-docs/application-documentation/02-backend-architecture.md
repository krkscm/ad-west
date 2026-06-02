# 02 - Backend Architecture

## Backend Stack

- Framework: NestJS
- Language: TypeScript
- Runtime: Node.js
- Global prefix: `/api/v1`
- API docs: `/api/docs` (enabled by env policy)

## Application Wiring

`src/app.module.ts` composes these modules:
- `HealthModule`
- `CoreBusinessModule.register(useDbPersistence)`
- `UserManagementModule.register(useDbPersistence)`
- `ApprovalWorkflowDefinitionsModule.register(useDbPersistence)`
- `EnumValuesModule.register(useDbPersistence)`
- `PublicGatewayModule.register(useDbPersistence)`
- `MemberServicesModule.register(useDbPersistence)`

Conditional persistence is controlled by `ENABLE_DB_PERSISTENCE`.

## Module Responsibilities

### Core Business (`src/modules/core-business`)

- Primary domain runtime orchestration and business state handling.
- Uses store abstraction (`CORE_BUSINESS_STORE`) with in-memory/postgres binding.
- Exposes a broad endpoint surface from `CoreBusinessController` under the global API prefix.

### User Management (`src/modules/user-management`)

Includes authentication, authorization, identity, and operational settings:
- Auth: `auth`
- Admin users: `admin-users`
- Audit: `audit-logs`
- Roles: `role-definitions`
- Menu visibility/grants: `menu-items`
- Menu grant hierarchy now uses a unified `General Services` parent (`governance` key) for governance and member-services child items.
- Google config: `settings/google-integration-config`
- SMTP/IMAP config: `settings/smtp-integration-config`
- Table layouts: `settings/table-layouts`
- AI query endpoint group: `ai-chat`
- Email send/inbox APIs: `gmail`

### Public Gateway (`src/modules/public-gateway`)

Public intake controllers:
- `public/helpdesk`
- `public/jobs`
- `public/sreni-contacts`

Admin operational controllers:
- `gateway/helpdesk`
- `gateway/jobs`

### Member Services (`src/modules/member-services`)

- `member-services/reimbursements`
- `member-services/events`
- `member-services/notifications`
- Public event registration group: `public/events`

### Supporting Modules

- `ApprovalWorkflowDefinitionsModule`: workflow definition layer.
- `EnumValuesModule`: enum/value catalogs and related boundaries.
- `HealthModule`: health endpoints and runtime readiness checks.

## Security and Runtime Guards

- Global throttling via `ThrottlerGuard`.
- Global request validation via `ValidationPipe` with strict whitelist settings.
- Global exception shaping via `AllExceptionsFilter`.
- CORS allow-list enforcement from `CORS_ORIGIN`.
- Security headers include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Request body limits are capped at 1 MB for JSON and URL-encoded payloads.
- Production requires DB persistence (`ENABLE_DB_PERSISTENCE=true`).

## Design Pattern Notes

- Module registration uses dynamic providers to avoid hard coupling to one persistence mode.
- Core business runtime is intentionally split into focused services/stores to keep orchestration thin.
- Public and member modules share guard and service patterns while preserving endpoint separation.

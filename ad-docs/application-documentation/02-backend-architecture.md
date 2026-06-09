# 02 - Backend Architecture

## Stack

- **Framework:** NestJS (TypeScript, Node.js 18+)
- **Global prefix:** `/api/v1`
- **API docs:** `/api/docs` (env-controlled)
- **Entry:** `ad-west-api/src/main.ts`, `ad-west-api/src/app.module.ts`

## Module composition

`app.module.ts` registers:

| Module | Responsibility |
|--------|----------------|
| `HealthModule` | Health/readiness |
| `CoreBusinessModule` | Primary domain (org, contacts, Sreni/Sthan, documents, reports) |
| `UserManagementModule` | Auth, admins, menus, integrations, audit, table layouts |
| `ApprovalWorkflowDefinitionsModule` | Workflow definition CRUD |
| `EnumValuesModule` | Reference data / enum catalog |
| `PublicGatewayModule` | Public + admin helpdesk/jobs |
| `MemberServicesModule` | Reimbursements, events, notifications |

Persistence is toggled with `ENABLE_DB_PERSISTENCE`. Each module uses `register(useDbPersistence)` for in-memory vs Postgres store binding.

## Core business module

**Orchestrator:** `core-business.service.ts`  
**HTTP:** `core-business.controller.ts` (large surface under `/org/*`, `/documents/*`, `/reports/*`, etc.)  
**Guards:** `CoreAdminAuthGuard`, `CoreMemberAuthGuard`

### Runtime service split

The monolithic service delegates to focused runtimes:

| Service | Role |
|---------|------|
| `org-runtime.service.ts` | Zones, locations, Sreni definitions, permissions, users |
| `sreni-admin-runtime.service.ts` | Per-Sreni contacts, divisions, reports, analytics, participants |
| `sthan-runtime.service.ts` | Sthan reports, expenses, calendar, contacts |
| `attendance-runtime.service.ts` | Metrics and event captures |
| `calendar-events-runtime.service.ts` | Sreni calendar |
| `permissions-runtime.service.ts` | Permission and permission-set CRUD |
| `user-admin-runtime.service.ts` | Settings users CRUD |
| `approval-runtime.service.ts` | Approval items |
| `document-report-runtime.service.ts` | Documents and report templates/submissions |

### Contact and household services (2026)

| Service | Role |
|---------|------|
| `contact-access-scope.service.ts` | Resolves actor → allowed Srenis, role level, sthan filter |
| `member-contact-upload.service.ts` | Excel parse, validation, preview, commit |
| `member-contact-persistence.service.ts` | Household/child row persistence on commit |
| `contact-template-generator.service.ts` | Serves `Member_Data_Upload_Template.xlsx` |
| `household-member.service.ts` | Family member CRUD synced from upload |
| `household-participant-resolver.service.ts` | Participant counts (ladies / enrolled children) |
| `seva-samithi-contact.service.ts` | Registry upsert/list; Seva Samithi identity match |
| `seva-samithi-contribution.service.ts` | Seva activity CRUD + document storage |
| `gada-assignment.service.ts` | Gadanayak registry and contact assignments |
| `join-us-review.service.ts` | Pending join-us submissions and review completion |

### DB lifecycle

| Service | Role |
|---------|------|
| `core-business-db-bootstrap.service.ts` | Idempotent DDL on startup (menus, optional tables/columns) |
| `core-business-db-hydration.service.ts` | Loads runtime state from Postgres into memory maps |

## Key API route groups

### Organization and settings

- `/org/zones`, `/org/locations`, `/org/sreni-definitions`, `/org/sthans`
- `/org/permissions`, `/org/permission-sets`, `/org/users`
- `/org/responsibility-chart`
- `/org/locations/:locationId/contacts/upload/preview` — Sthan-scoped upload preview

### Contacts

| Endpoint pattern | Purpose |
|------------------|---------|
| `GET /org/contacts` | Global paginated contact list (scope-filtered) |
| `GET /org/contacts/upload-template` | Download member Excel template |
| `POST /org/contacts/upload/preview` | Parse upload, return row decisions |
| `POST /org/contacts/upload/commit` | Apply preview decisions |
| `GET/PUT /org/contacts/:id/sreni-tags` | Cross-Sreni membership tags |
| `PATCH /org/contacts/:id` | Update household JSON data |
| `GET /org/sreni-definitions/:sreniId/contacts` | Per-Sreni list (scope + gada filters) |
| `POST .../contacts/upload/preview` | Sreni-scoped upload preview |
| `PATCH .../contacts/:id/division`, `/sthan`, `/active` | Assignment and lifecycle |
| `GET/POST/PATCH/DELETE .../contacts/:id/members` | Household members |
| `GET .../contacts/:id/participants` | Resolved participants (strategy-dependent) |

### Seva Samithi (Seva Samithi Sreni only)

- Registry maintained automatically on member upload (`seva_samithi_contacts`)
- Delete from SS list removes registry row only (household retained)
- `GET/POST/PATCH/DELETE .../contacts/:id/seva-contributions`
- `POST .../seva-contributions/:id/documents` — multi-file upload (`files`, max 10 × 5 MB)
- `GET /org/seva-contribution-documents/:id/download`
- `DELETE /org/seva-contribution-documents/:id`

### Gada assignment

- `GET/POST/DELETE /org/sreni-definitions/:sreniId/gadanayaks`
- `GET .../gadanayak-eligible-users?sthanId=`
- `PATCH/DELETE .../contacts/:contactId/gada`
- `POST .../contacts/gada/bulk`
- Contact list query: `gadaFilter=all|unassigned|mine`, optional `gadanayakUserId`

### Join Us review

- `GET /org/join-us-submissions`
- `POST /org/join-us-submissions/:contactId/complete-review`

## Contact access scope

Implemented in `contact-access-scope.service.ts` and enforced via `core-business.service.ts` → `assertContactAccess`.

**Actor resolution:** JWT principal → row in `adwest.users` (by UUID or email match). Missing user row → `403` for scoped operations.

**Scope fields:**

| Field | Source |
|-------|--------|
| `unrestricted` | `users.is_super_admin` |
| `allowedSreniIds` | `permission_set_items` → `permissions.sreni_id` |
| `roleLevel` | `role_definitions.level` (`ZONE` \| `STHAN`) |
| `sthanLocationId` | `users.sthan_id` when role is STHAN |

**Seva Samithi context:** contact must exist in `seva_samithi_contacts`; STHAN role still applies sthan filter on contact location fields.

**Per-Sreni list:** always filtered to URL `sreniId` (tags or `sreni_id`). Seva Samithi registry contacts do **not** appear on other Sreni lists unless Excel marks membership Yes (`contact_sreni_tags`).

## Data shapes (contacts)

`SreniContactRecord` / `sreni_contacts` row:

- `data` — JSONB flexible columns from Excel
- `contact_kind` — `household` \| `child`
- `parent_contact_id` — child → household link
- `sr_no` — template serial number
- `division_id`, `sthan_id` — primary assignment
- `zone_location_id`, `sthan_location_id`, `division_location_id` — hierarchy tags
- `active`, `review_status`, `reviewed_at`, `reviewed_by` — lifecycle and join-us
- `sreni_id` — nullable for global/Seva Samithi households

## User management module

- `auth.controller.ts` — login, Google OAuth, forgot/reset password, captcha
- `admin-users.controller.ts` — `auth_admin_users` CRUD
- `menu-management.service.ts` — `menu_items`, `admin_menu_grants`
- `role-definitions.controller.ts`
- Integration settings: Google, SMTP/IMAP
- `gmail` send/inbox, audit logs, AI query, user table layouts

## Public gateway module

`public-gateway.controller.ts`:

- Public: `/public/helpdesk`, `/public/jobs`, `/public/sreni-contacts`
- Admin: `/gateway/helpdesk`, `/gateway/jobs` (+ application activities)

## Member services module

- `/member-services/reimbursements`, `/events`, `/notifications`
- `/public/events/:id/register`

## Security defaults

- Global `ThrottlerGuard` and strict `ValidationPipe` (whitelist)
- `AllExceptionsFilter` for consistent error shape
- CORS from `CORS_ORIGIN`
- Security headers on all responses
- JSON body limit 1 MB (contact upload uses multipart with separate limits)
- Production requires `ENABLE_DB_PERSISTENCE=true`

## Design patterns

- Store abstraction (`CORE_BUSINESS_STORE`) for testability and in-memory dev
- Thin controller → service → focused runtime service
- Direct SQL (`DataSource.query`) for contact list performance and new 074–078 tables
- File storage under `UPLOAD_DIR` (documents, seva contribution attachments, job resumes)

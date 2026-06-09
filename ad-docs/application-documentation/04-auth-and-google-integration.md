# 04 - Authentication, Access Control, and Integrations

## Identity types

ADWest uses **four distinct identity concepts**. They are related but not interchangeable.

| Identity | Table | Used for |
|----------|-------|----------|
| **Admin login account** | `adwest.auth_admin_users` | Sign-in, menu grants, legacy role assignments |
| **Organizational user** | `adwest.users` | Permission sets, contact data scope, org chart, gada eligibility |
| **Member account** | `adwest.auth_member_users` | Member portal |
| **Super-admin user** | `adwest.users` where `is_super_admin = true` | Full data access + admin workspace login |

### Admin vs organizational user

- **Admin account** controls **which menus** appear in the admin UI (`admin_menu_grants`).
- **Organizational user** controls **which contact/Sreni data** API operations may touch (`ContactAccessScopeService`).
- An admin JWT alone is **not** sufficient for scoped contact mutations unless the principal email matches a `users` row (or is super-admin).

## Login flow

**Endpoint:** `POST /api/v1/auth/login` (captcha + rate limiting)

**Resolution order** (`auth.service.ts`):

1. Application user — `users` with `is_super_admin` and valid password
2. Member — `auth_member_users`
3. Admin — `auth_admin_users` by code or email

**Token types:** JWT bearer; `type: admin | member`; admin may carry `origin: user` for super-admin path.

**Workspace routing (frontend):** after login, `AuthContext` sends admin tokens to `/admin/*` and member tokens to member portal.

### Current limitation

Non-super-admin rows in `adwest.users` are used for **data scope and org structure** but do **not** currently receive a successful login through the unified `/auth/login` path. Operational admins typically use `auth_admin_users` accounts; scope requires a matching `users` row linked by email.

## Contact access scope (data layer)

Separate from menu grants. Resolved in `contact-access-scope.service.ts`:

```
JWT principal
  → match adwest.users (id or email)
  → permission_set_id → allowed sreni_ids
  → role_id → ZONE | STHAN
  → sthan_id (if STHAN)
```

| Role level | Contact list behavior |
|------------|----------------------|
| **ZONE** | All contacts in allowed Srenis (location tags ignored for scope) |
| **STHAN** | Allowed Srenis **and** contacts matching user's sthan |
| **Super admin** | Unrestricted |

**Seva Samithi:** registry membership required; same sthan rules apply for STHAN role.

## Admin roles (legacy assignments)

`auth_admin_users` may have role assignments: `SUPER_ADMIN`, `ZONE_ADMIN`, `SRENY_ADMIN` with scope type global/zone/sreny. These complement but do not replace permission-set data scope.

## Session and security

- Sessions stored in `auth_sessions`
- Failed login lockout (5 attempts, 15-minute window)
- Captcha on credential login
- Global `ThrottlerGuard` + route-level limits on sensitive endpoints
- `POST /auth/forgot-password`, `POST /auth/reset-password` — admin password reset via `admin_password_reset_tokens` (single-use, expiring)

## Google OAuth

**Config precedence:** DB (`integration_google_config`) → environment variables

| Endpoint | Purpose |
|----------|---------|
| `GET /auth/google/start` | Begin OAuth |
| `GET /auth/google/callback` | Complete OAuth |
| `GET/PATCH /settings/google-integration-config` | Settings UI |

OAuth email must map to an active authorized admin. Popup origin checks allow split-port local dev.

## Email (SMTP + IMAP)

- Settings: `integration_smtp_config`
- `POST /gmail/send`, `GET /gmail/inbox`
- Independent of Google OAuth at send/read time

## Permission sets (settings model)

Defined in migrations `022`, `023`, `024`:

- **Permission** — `location_id` + `sreni_id` pair
- **Permission set** — bundle of permissions
- **User** — `role_id`, `sthan_id`, `permission_set_id`, `is_super_admin`

Settings UI: Permission Definitions, Permission Sets, Users. Enforcement for contacts is in core-business guards, not in menu grants.

## Forgot password flow

1. `/forgot-password` → `POST /auth/forgot-password`
2. Token in `admin_password_reset_tokens`
3. `/reset-password?token=...` → `POST /auth/reset-password`
4. Non-disclosing responses for unknown emails

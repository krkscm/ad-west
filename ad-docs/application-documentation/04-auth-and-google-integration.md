# 04 - Authentication, Google Integration, and Email

## Authentication Modes

### Admin Authentication

- Credential + captcha login path
- Token/session validation on guarded endpoints
- Account lock behavior on repeated failed attempts
- Forgot-password and reset-password public endpoints with throttling

### Member Authentication

- Dedicated member login and member guard path
- Workspace routing is resolved by authenticated user type in frontend app shell

### Unified Credential Behavior

- Backend supports workspace-aware credential resolution so authenticated identity maps to admin/member surfaces.

## Session Model

- Issued token carries identity/session claims.
- Backend validates active session context for protected routes.
- Role/menu-based access is enforced by guard + service checks.

## Google OAuth Integration

### Configuration Resolution

Order of precedence:
1. DB configuration (`adwest.integration_google_config`) when persistence is enabled
2. Environment fallback (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEB_APP_ORIGIN`)

### Endpoint Surface

- `GET /api/v1/auth/google/start`
- `GET /api/v1/auth/google/callback`
- `GET /api/v1/settings/google-integration-config`
- `PATCH /api/v1/settings/google-integration-config`

### Authorization Gate

- OAuth-authenticated email must map to an active authorized admin identity.
- Unauthorized or inactive identities are rejected.

## Email Integration (SMTP + IMAP)

### Runtime Model

- Outbound email: `MailService` (SMTP)
- Inbox retrieval: `ImapService` (IMAP)
- Settings store: `adwest.integration_smtp_config`

### Endpoint Surface

- `POST /api/v1/gmail/send`
- `GET /api/v1/gmail/inbox`
- `GET /api/v1/settings/smtp-integration-config`
- `PATCH /api/v1/settings/smtp-integration-config`

### Frontend Availability

- Email workspace is available in admin navigation.
- SMTP/IMAP runtime is configuration-driven and does not require Google OAuth at send/read operation time.

## Forgot Password Flow

### Runtime Flow

1. User submits email on `/forgot-password`.
2. Backend processes `POST /api/v1/auth/forgot-password` with response-shaping that avoids account disclosure.
3. Time-limited reset token is stored in `adwest.admin_password_reset_tokens`.
4. User opens `/reset-password?token=...`.
5. Backend validates token and applies new password through `POST /api/v1/auth/reset-password`.

### Security Properties

- Single-use token lifecycle
- Expiry enforcement
- Endpoint throttling
- Non-disclosing response semantics for unknown emails

## Runtime Notes

- OAuth popup message origin checks allow expected frontend/API origins for localhost split-port development.
- Integration settings remain DB-first with env fallback behavior.
- For Google config updates, `updated_by` FK is nullable to handle mixed principal types safely.

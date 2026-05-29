# 04 - Authentication and Google Integration

## Authentication Modes

### Admin Authentication
- Password + captcha flow
- Token includes role claims and session id
- Guarded endpoints validate token and active session
- Brute-force protection applies account lockout after repeated failed attempts

### Member Authentication
- Member-specific login endpoint and token validation flow

### Unified Credential Login
- Backend supports a unified identifier/password/captcha login path that resolves workspace identity (core user, member, or admin) by credentials.

## Session Model

- Signed token payload includes subject (`sub`), type, roles, and session id.
- Session records are validated server-side for expiry and type.

## Google OAuth Integration

## Configuration Source
Google integration settings are resolved in this priority:
1. DB-backed integration config table (when persistence is enabled)
2. Environment fallback values

Managed settings include:
- client ID
- client secret (retain/clear semantics)
- redirect URI
- OAuth scopes
- web app origin
- integration enabled toggle

## OAuth Flow (Implemented)
1. Frontend opens `/auth/google/start`
2. Backend builds Google consent URL
3. Callback endpoint exchanges code for tokens
4. Backend issues app session/token
5. Popup callback sends token to opener page
6. Frontend stores token and hydrates user state

## Gmail Integration

- Server-side endpoints expose:
  - send email
  - read inbox preview
- Access token refresh handling is managed backend-side.
- Gmail send/read operations require an authenticated admin session with Google OAuth connection.

## Settings Endpoint

Super Admin can manage Google integration settings via:
- `GET /api/v1/settings/google-integration-config`
- `PATCH /api/v1/settings/google-integration-config`

## Important Runtime Note

For principals that are not from `auth_admin_users`, update-audit attribution for Google config updates is FK-safe handled by writing nullable `updated_by` where needed.

Google OAuth start flow also validates enabled state and configured origin/redirect values before issuing consent URL.

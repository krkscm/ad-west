# 04 - Authentication, Google Integration, and Email

## Authentication Modes

### Admin Authentication
- Password + captcha flow
- Token includes role claims and session id
- Guarded endpoints validate token and active session
- Brute-force protection applies account lockout after repeated failed attempts
- Forgot password flow via email (see below)

### Member Authentication
- Member-specific login endpoint and token validation flow

### Unified Credential Login
- Backend supports a unified identifier/password/captcha login path that resolves workspace identity (core user, member, or admin) by credentials.

## Session Model

- Signed token payload includes subject (`sub`), type, roles, and session id.
- Session records are validated server-side for expiry and type.

## Google OAuth Integration

### Configuration Source
Google integration settings are resolved in this priority:
1. DB-backed `adwest.integration_google_config` table (when persistence is enabled)
2. Environment fallback values (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEB_APP_ORIGIN`)

### Configured Values (localhost dev)
| Setting | Value |
|---|---|
| Client ID | `653659463926-tt1k4egcm66j5d2k5r4sc47m8sdjipmg.apps.googleusercontent.com` |
| Redirect URI | `http://localhost:3001/api/v1/auth/google/callback` |
| Web App Origin | `http://localhost:3000` |
| OAuth Scopes | `openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly` |
| Enabled | `true` |

Client secret is stored in DB only (not documented here for security).

### Google Cloud Console Setup
The following must be registered in the OAuth 2.0 Client in Google Cloud Console:

**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3001/api/v1/auth/google/callback
```

### OAuth Flow
1. Frontend opens popup to `/auth/google/start`
2. Backend builds Google consent URL using DB config
3. Google redirects back to `/auth/google/callback` with auth code
4. Backend exchanges code for tokens, fetches Google profile
5. Backend checks if email exists in `auth_admin_users` (or `adwest.users` with `is_super_admin`) — rejects if not found or inactive
6. Backend issues app session/token, popup sends it to opener via `postMessage`
7. Frontend validates origin (allows both frontend origin and API origin for localhost dev) and stores token

### Authorization Gate
Google sign-in is restricted to users whose email exists in the admin users table with active status and at least one active role assignment. Any Google account not in the table is rejected with `401 Unauthorized`.

### Settings Endpoint (Super Admin only)
- `GET /api/v1/settings/google-integration-config`
- `PATCH /api/v1/settings/google-integration-config`

---

## Email Integration (SMTP + IMAP)

### Overview
Email is sent via SMTP using nodemailer and inbox is read via IMAP using imapflow. All configuration is stored in `adwest.integration_smtp_config` and managed from the admin panel under **Settings → Email Integration**.

### Configured Values (localhost dev)
| Setting | Value |
|---|---|
| SMTP Host | `smtp.gmail.com` |
| SMTP Port | `587` |
| Encryption | `TLS / STARTTLS` |
| Username | `auhwesthelpdesk@gmail.com` |
| From Name | `AD West Helpdesk` |
| IMAP Host | `imap.gmail.com` |
| IMAP Port | `993` |
| Enabled | `true` |

Password is a Gmail App Password stored in DB only (not documented here for security).

### SMTP Send Flow
1. `POST /api/v1/gmail/send` (requires admin auth)
2. `MailService` reads SMTP config from DB
3. Creates nodemailer transporter with STARTTLS
4. Sends email from `"AD West Helpdesk" <auhwesthelpdesk@gmail.com>`

### IMAP Inbox Flow
1. `GET /api/v1/gmail/inbox` (requires admin auth)
2. `ImapService` reads SMTP config (reuses username/password/IMAP host) from DB
3. Connects to `imap.gmail.com:993` via SSL
4. Fetches latest N messages from INBOX by envelope (subject, from, date)
5. Returns list in reverse chronological order

### Settings Endpoint (Super Admin only)
- `GET /api/v1/settings/smtp-integration-config`
- `PATCH /api/v1/settings/smtp-integration-config`

### Email Workspace (Frontend)
Available in the admin panel under the **Gmail** menu item. Does not require Google OAuth — works entirely via SMTP/IMAP credentials stored in DB.

---

## Forgot Password

### Overview
Admin users can reset their password via a time-limited email link. The flow uses the existing SMTP integration (`auhwesthelpdesk@gmail.com`) so no additional email service is needed.

### Flow
1. User clicks **"Forgot password?"** on the login page
2. Enters their admin email at `/forgot-password`
3. `POST /api/v1/auth/forgot-password` — backend looks up email in `auth_admin_users`; if found and active, generates a 64-char cryptographically random token, stores it in `adwest.admin_password_reset_tokens` (1-hour expiry), sends a branded HTML reset email
4. Response is always `{ success: true }` — email existence is never revealed
5. User clicks the link in the email → navigated to `/reset-password?token=xxx`
6. `POST /api/v1/auth/reset-password` — backend validates token (expiry check), hashes new password, updates `auth_admin_users.password_hash`, clears `failed_attempts` and `locked_until`, deletes token (single-use)
7. Success screen links back to `/login`

### DB Table
`adwest.admin_password_reset_tokens` — migration `054_admin_password_reset_tokens.sql`

| Column | Type | Description |
|---|---|---|
| `token` | `VARCHAR(128) PK` | 64-char hex random token |
| `user_email` | `VARCHAR(255)` | Normalized lowercase email |
| `expires_at` | `TIMESTAMPTZ` | 1 hour from creation |
| `created_at` | `TIMESTAMPTZ` | Auto-set |

Indexed on `user_email` and `expires_at`. Old tokens for the same email are deleted before a new one is issued.

### Security Properties
- Token is 256-bit random (`crypto.randomBytes(32)`)
- 1-hour expiry enforced server-side
- Single-use — deleted immediately after successful reset
- Rate-limited: 5 requests/minute on both endpoints
- Never reveals whether an email is registered (constant-time response)
- Resets account lockout (`failed_attempts = 0`, `locked_until = NULL`) on successful reset

### Endpoints
- `POST /api/v1/auth/forgot-password` — public, throttled (5/min)
- `POST /api/v1/auth/reset-password` — public, throttled (5/min)

### Frontend Pages
- `/forgot-password` → `ForgotPasswordPage.tsx` — email input, always shows "check your inbox" on submit
- `/reset-password?token=xxx` → `ResetPasswordPage.tsx` — new password + confirm, password visibility toggle, redirects to login on success

---

## Important Runtime Notes

- Google OAuth origin check in `AuthContext.tsx` accepts messages from both `window.location.origin` (frontend) and `VITE_API_PROXY_TARGET` origin (API) to support localhost dev where ports differ.
- IMAP connection uses `tls: { rejectUnauthorized: false }` to handle certificate chain issues in development environments.
- For Google config updates, `updated_by` FK is nullable to handle mixed principal types safely.

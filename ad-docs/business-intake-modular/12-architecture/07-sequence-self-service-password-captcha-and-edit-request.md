# Sequence Diagram: Self-Service Password + Captcha and Edit Request

## Scope
Primary user journey for member authentication using identifier + password + captcha, profile access, and edit request.

```mermaid
sequenceDiagram
  autonumber
  participant M as Member
  participant UI as Self-Service Portal
  participant API as NestJS API
  participant AUTH as Auth Service
  participant DB as PostgreSQL

  M->>UI: Enter email/phone + password + captcha answer
  UI->>API: POST /auth/member/login
  API->>AUTH: Validate captcha token and answer
  AUTH-->>API: Captcha valid
  API->>DB: Lookup member by email/phone
  DB-->>API: Match found
  API->>AUTH: Verify password and lockout status
  AUTH-->>API: Valid + session token
  API->>DB: Store auth session
  API-->>UI: Login success

  M->>UI: Submit contact edit request
  UI->>API: Edit request payload
  API->>DB: Store EditRequest(status=New)
  DB-->>API: Saved
  API-->>UI: Request accepted
```

## Verification Checklist
- [ ] Captcha validation is required before authentication.
- [ ] Failed login attempts enforce account lockout.
- [ ] Sessions are persisted for authenticated members.
- [ ] Edit requests are stored for admin approval flow.

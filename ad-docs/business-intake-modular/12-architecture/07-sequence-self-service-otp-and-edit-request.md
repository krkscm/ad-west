# Sequence Diagram: Self-Service OTP and Edit Request

## Scope
Primary user journey for member verification, OTP login, profile access, and edit request.

```mermaid
sequenceDiagram
  autonumber
  participant M as Member
  participant UI as Self-Service Portal
  participant API as NestJS API
  participant AUTH as Auth Service
  participant N8N as n8n
  participant MAIL as Email Provider
  participant DB as PostgreSQL

  M->>UI: Enter name + phone/email
  UI->>API: Verify member identity request
  API->>DB: Lookup contact and membership
  DB-->>API: Match found
  API->>AUTH: Generate OTP token (10 min)
  AUTH-->>API: OTP reference
  API->>N8N: Trigger N8N-COM-013
  N8N->>MAIL: Send OTP email
  MAIL-->>M: OTP message

  M->>UI: Submit OTP
  UI->>API: Validate OTP
  API->>AUTH: Verify OTP and TTL
  AUTH-->>API: Valid
  API-->>UI: Session created

  M->>UI: Submit contact edit request
  UI->>API: Edit request payload
  API->>DB: Store EditRequest(status=New)
  DB-->>API: Saved
  API-->>UI: Request accepted
```

## Verification Checklist
- [ ] OTP expiry is enforced at 10 minutes.
- [ ] Edit requests are stored for admin approval flow.
- [ ] Notification trigger aligns to N8N-COM-013.

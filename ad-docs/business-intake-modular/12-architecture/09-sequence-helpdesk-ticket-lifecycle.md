# Sequence Diagram: Helpdesk Ticket Lifecycle

## Scope
Ticket lifecycle from member submission to closure without external notification dependency in current phase.

```mermaid
sequenceDiagram
  autonumber
  participant M as Member
  participant UI as Portal
  participant API as NestJS API
  participant HD as Helpdesk Service
  participant DB as PostgreSQL

  M->>UI: Create ticket(subject, category, priority, attachment)
  UI->>API: Submit ticket
  API->>HD: Validate and create ticket
  HD->>DB: Save ticket(status=New)

  participant O as Operator
  O->>UI: Assign ticket
  UI->>API: Update status to Assigned/In Progress
  API->>HD: Apply status transition
  HD->>DB: Persist change

  O->>UI: Resolve then close ticket
  UI->>API: Status transitions Resolved to Closed
  API->>DB: Persist lifecycle
  API-->>UI: Updated ticket timeline
```

## Verification Checklist
- [ ] Lifecycle matches New, Assigned, In Progress, Resolved, Closed.
- [ ] Lifecycle works without n8n or external messaging dependency.
- [ ] Ticket comments and assignment are auditable.

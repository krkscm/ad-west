# Sequence Diagram: Helpdesk Ticket Lifecycle

## Scope
Ticket lifecycle from member submission to closure with email notifications.

```mermaid
sequenceDiagram
  autonumber
  participant M as Member
  participant UI as Portal
  participant API as NestJS API
  participant HD as Helpdesk Service
  participant DB as PostgreSQL
  participant N8N as n8n
  participant MAIL as Email Provider

  M->>UI: Create ticket(subject, category, priority, attachment)
  UI->>API: Submit ticket
  API->>HD: Validate and create ticket
  HD->>DB: Save ticket(status=New)
  HD->>N8N: Trigger N8N-COM-004
  N8N->>MAIL: Notify operator

  participant O as Operator
  O->>UI: Assign ticket
  UI->>API: Update status to Assigned/In Progress
  API->>HD: Apply status transition
  HD->>DB: Persist change
  HD->>N8N: Trigger N8N-COM-005
  N8N->>MAIL: Notify member status update

  O->>UI: Resolve then close ticket
  UI->>API: Status transitions Resolved to Closed
  API->>DB: Persist lifecycle
  API-->>UI: Updated ticket timeline
```

## Verification Checklist
- [ ] Lifecycle matches New, Assigned, In Progress, Resolved, Closed.
- [ ] Notification triggers align to configured workflows.
- [ ] Ticket comments and assignment are auditable.

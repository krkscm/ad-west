# Deferred Notification Workflow Sequence Diagram

## Deferred in Current Phase
- Status: Deferred.
- Activation path: Future phase only via approved scope change.

## Scope
Deferred notification workflow blueprint for future-phase activation only.

## Current Phase Rule
- No n8n integration is active.
- No messaging workflow is executed at runtime.

```mermaid
sequenceDiagram
  autonumber
  participant APP as NestJS API
  participant EVT as Internal Event Marker
  participant MAIL as Email Provider
  participant USER as Member or Operator

  rect rgb(232,244,253)
    Note over APP,EVT: N8N-COM-013 (Deferred)
    APP->>EVT: Emit deferred login/access event marker
    EVT-->>MAIL: Future integration path
    MAIL-->>USER: Receive login/access notification
  end

  rect rgb(238,247,238)
    Note over APP,EVT: N8N-COM-004 (Deferred)
    APP->>EVT: Emit deferred ticket-raised marker
    EVT-->>MAIL: Future integration path
    MAIL-->>USER: Operator receives alert
  end

  rect rgb(255,243,205)
    Note over APP,EVT: N8N-COM-005 (Deferred)
    APP->>EVT: Emit deferred status-change marker
    EVT-->>MAIL: Future integration path
    MAIL-->>USER: Member receives update
  end

  rect rgb(253,236,236)
    Note over APP,EVT: N8N-COM-002 (Deferred)
    APP->>EVT: Emit deferred registration marker
    EVT-->>MAIL: Future integration path
    MAIL-->>USER: Member receives confirmation
  end
```

## Verification Checklist
- [ ] All four deferred workflow IDs are documented.
- [ ] Current phase has no active runtime dependency on this diagram.
- [ ] Future activation requires approved scope change.

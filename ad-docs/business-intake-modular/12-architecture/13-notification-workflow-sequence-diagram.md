# Notification Workflow Sequence Diagram

## Scope
MVP notification workflows N8N-COM-013, 004, 005, and 002.

```mermaid
sequenceDiagram
  autonumber
  participant APP as NestJS API
  participant N8N as n8n
  participant MAIL as Email Provider
  participant USER as Member or Operator

  rect rgb(232,244,253)
    Note over APP,N8N: N8N-COM-013 OTP Login
    APP->>N8N: Trigger OTP workflow with recipient and context
    N8N->>MAIL: Send OTP email
    MAIL-->>USER: Receive OTP
  end

  rect rgb(238,247,238)
    Note over APP,N8N: N8N-COM-004 Ticket Raised
    APP->>N8N: Trigger operator notification
    N8N->>MAIL: Send ticket created email
    MAIL-->>USER: Operator receives alert
  end

  rect rgb(255,243,205)
    Note over APP,N8N: N8N-COM-005 Ticket Status Change
    APP->>N8N: Trigger member status update
    N8N->>MAIL: Send status update email
    MAIL-->>USER: Member receives update
  end

  rect rgb(253,236,236)
    Note over APP,N8N: N8N-COM-002 Registration Confirmation
    APP->>N8N: Trigger registration confirmation
    N8N->>MAIL: Send confirmation email
    MAIL-->>USER: Member receives confirmation
  end
```

## Verification Checklist
- [ ] All four MVP workflows are represented.
- [ ] Trigger source is the API business event.
- [ ] Email delivery is the only notification channel in MVP.

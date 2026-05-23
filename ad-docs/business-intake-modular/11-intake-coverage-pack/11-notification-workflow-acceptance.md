# Notification Workflow Acceptance Baseline

## MVP Workflows In Scope
- N8N-COM-013: Self-service login OTP email.
- N8N-COM-004: Helpdesk ticket raised email.
- N8N-COM-005: Helpdesk ticket status change email.
- N8N-COM-002: Program registration confirmation email.

## Acceptance Criteria
- Each workflow is triggered from the correct business event.
- Workflow payload contains required recipient and context data.
- Delivery outcome is logged for operational tracing.
- Failure path is visible and retry is operationally manageable.

## Exclusions to Enforce
- WhatsApp workflows.
- SMS workflows.
- Broadcast workflow set.

## Test Evidence Checklist
- [ ] Trigger validation per workflow.
- [ ] Payload validation evidence.
- [ ] Delivery and failure log evidence.
- [ ] End-to-end notification receipt evidence.

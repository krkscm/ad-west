# Deferred Notification Workflow Acceptance Baseline

## Deferred in Current Phase
- Status: Deferred.
- Activation path: Future phase only via approved scope change.

## Current Phase Status
- Messaging system is out of scope in this phase.
- n8n integration is out of scope in this phase.
- In-app approval notifications within the web app are in scope (Actions queue + notification popover unread count).

## Activation Pre-Conditions (Future Phase)
- Sponsor-approved change request to remove deferred control.
- Cost impact and operational ownership documented.
- Security and delivery-failure handling reviewed.

## Exclusions to Enforce (Current Phase)
- All n8n workflow IDs.
- All email notification workflows.
- WhatsApp workflows.
- SMS workflows.
- Broadcast workflow set.
- Any external notification transport beyond in-app UI state.

## Test Evidence Checklist (Current Phase)
- [ ] Verify notification triggers are disabled or not invoked.
- [ ] Verify no n8n dependency is required for E2E flows.
- [ ] Verify core module flows complete without messaging side effects.
- [ ] Verify approval notifications appear in popover with unread highlight count.

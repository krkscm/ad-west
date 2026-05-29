# Module 04 Acceptance Baseline: Program and Event Management

## In-Scope Capabilities
- Program creation per Sreny.
- Single-day and multi-day scheduling.
- Session breakdown under each program.
- Admin and self-service registration with waitlist support.
- Sreni calendar event persistence through backend APIs with DB-backed runtime snapshot storage.
- Scope-aware calendar events with Zone or Sthan visibility scope.
- Calendar event create/update automatically creates approval-line actions for the requester's Reporting To chain.

## Acceptance Criteria
- Programs support required fields and lifecycle states.
- Multi-session programs can be defined and updated.
- Registration switches to waitlist when capacity is reached.
- Program updates preserve registration consistency.
- For users with Zone rights, Zone events take precedence per date and override Sthan event visibility for that date.
- Users with access to multiple Sthans can view all same-date Sthan events mapped to their allowed Sthans.
- Event approval action supports `Approved`, `Rejected`, and `Need More Information` decisions.
- If `Need More Information` is selected, the requester can resubmit information and the item re-enters the approval flow.

## Exclusions to Enforce
- Recurring schedule engine.
- Custom registration form fields.

## Test Evidence Checklist
- [ ] Program CRUD evidence.
- [ ] Session management evidence.
- [ ] Waitlist behavior evidence.
- [ ] Registration consistency checks.
- [ ] Calendar CRUD over backend API evidence (no localStorage dependency).
- [ ] Zone-over-Sthan same-date precedence evidence.
- [ ] Multi-Sthan same-date visibility evidence.
- [ ] Calendar event submission generates approval action lines for Reporting To users.
- [ ] Need More Information event flow returns to requester and supports resubmission.

## Backend Structure Note
- Core Business event approval runtime has been extracted into dedicated domain service files to reduce monolithic service growth.
- Core Business calendar event runtime is extracted into a dedicated backend domain service (`calendar-events-runtime.service.ts`) and Core Business now delegates orchestration to it.

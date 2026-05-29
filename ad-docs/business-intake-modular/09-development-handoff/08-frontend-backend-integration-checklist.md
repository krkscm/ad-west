# Frontend and Backend Integration Checklist

## Purpose
Provide a concrete readiness gate to start and complete frontend integration against backend APIs.

## Pre-Integration Checks
- [ ] Backend base path is configured to `/api/v1`.
- [ ] Frontend env value `VITE_API_URL` points to backend base path.
- [ ] CORS is enabled for local frontend origin.
- [ ] Auth headers are included for admin and member protected routes.
- [ ] Frontend implementation pattern guide is approved and referenced by implementers.

## Contract Alignment Checks
- [ ] Frontend request payloads match documented DTO fields.
- [ ] Frontend handles API validation error shape for 400 responses.
- [ ] Frontend handles 401 and 403 with session reset or access denial UI.
- [ ] Frontend list screens support server-side filtering and pagination inputs.
- [ ] Frontend light and dark themes are both validated for each integrated screen.

## Module Integration Sequence
1. M-08 admin auth and RBAC routes
2. M-02 contacts and search
3. M-07 member self-service and edit requests
4. M-06 helpdesk and comments
5. M-04 programs and registrations
6. M-05 attendance and reports
7. M-03 import and dedup decisions
8. M-01 org hierarchy management

## Test Readiness Checks
- [ ] Smoke test for each endpoint in the endpoint catalog.
- [ ] One happy path and one authorization-failure path per protected endpoint.
- [ ] One validation failure test per create/update endpoint.
- [ ] Audit event verification for sensitive write operations.
- [ ] Import reconciliation path includes failed-state handling and reason capture.
- [ ] Helpdesk ticket activity timeline endpoint is verified from admin UI flow.
- [ ] Core persistence readiness endpoint is checked before UAT handoff.
- [x] Import reconciliation admin screen has integration tests for load + reconciliation flow.
- [x] Ticket activity admin screen has integration tests for timeline load + render flow.

## Definition of Done for Integration
- [ ] Frontend no longer depends on mock database for in-scope Core Business screens.
- [ ] Backend route coverage reaches all in-scope catalog endpoints.
- [ ] Acceptance checks in module baseline docs pass.
- [ ] Demo flow can execute without manual data patching.
- [ ] Delivered screens are consistent with approved design baseline and token usage.
- [ ] Theme toggle and persisted user theme preference are working in production build.
- [ ] Regression suite includes persistence-readiness and import failure/reconciliation scenarios.

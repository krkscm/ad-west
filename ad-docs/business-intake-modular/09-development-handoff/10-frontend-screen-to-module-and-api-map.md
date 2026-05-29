# Frontend Screen to Module and API Map

## Purpose
Define which screens consume which module APIs, and sequence mock-to-API migration without breaking existing design.

## Screen Mapping
| Screen | Primary Module(s) | Primary Endpoint Groups | Notes |
|---|---|---|---|
| Sign-In Entry | M-08, M-07 | /auth/captcha, /auth/login | Unified credential + captcha entry |
| Sign-In Workspace | M-08 | /auth/captcha, /auth/login | Password + captcha only |
| Admin Dashboard (overview) | M-08, M-06, M-02 | /audit-logs, /helpdesk/tickets, /contacts | Keep existing dashboard card layout and authenticated footer |
| Import Reconciliation | M-03 | /imports, /imports/:importId/reconciliation, /imports/:importId/fail, /imports/:importId/finalize | Dedicated admin screen for import failed-state and finalize gate handling |
| Ticket Activity | M-06 | /helpdesk/tickets/:ticketId/activity | Dedicated admin screen for helpdesk operational timeline |
| Admin Users | M-08 | /admin-users, /admin-users/:id/status, /admin-users/:id/roles | Preserve modal-based create/edit pattern |
| Settings Pages | M-08 | /role-definitions, /locations, /srenies, /permissions, /permission-sets, /users, /approval-workflows, /attendance-metrics, /report-metrics | These are rendered inside the authenticated admin shell under Settings |
| Sreni Dynamic Views | M-02, M-04, M-05, M-06, M-08 | /menu-items, /org/sreni-definitions/*, /attendance/*, /helpdesk/* | Calendar, contacts, attendance, documents, and reports are mounted from backend menu data |
| Edit Requests | M-07 | /members/me/edit-requests, admin approval endpoints | Preserve approve/reject workflow |
| Audit Logs | M-08 | /audit-logs | Keep filters and expandable detail rows |
| Member Portal Profile | M-07, M-02 | /members/me/profile, /members/me/edit-requests | Preserve profile + edit request interaction |
| Member Portal Programs | M-07, M-04, M-05 | /members/me/programs | Preserve member history presentation |
| Member Portal Tickets | M-07, M-06 | /members/me/helpdesk-tickets, /helpdesk/tickets | Preserve member ticket timeline style |

## Migration Order
1. Auth flows (neutral password login with captcha)
2. Admin users and role management
3. Audit log and dashboard counters
4. Member profile and edit requests
5. Helpdesk flows
6. Program and attendance history
7. Import reconciliation and failed-state handling
8. Ticket activity timeline operations

## Mock-to-API Replacement Rule
- Replace one screen flow at a time.
- Keep UI components and style classes stable during data-source change.
- Add adapters if API shape differs from current UI view model.
- Remove mock path only after endpoint happy path and failure path are verified.
- Treat backend menu definitions as supporting data for Sreni navigation only.

## Verification Checklist Per Screen
- [ ] Success state uses live API data.
- [ ] Loading state is visible.
- [ ] Empty state is visible.
- [ ] Validation and server errors are shown via existing feedback pattern.
- [ ] Role and scope restrictions are enforced in UI behavior.

## Change Log
| Version | Date | Updated By | Summary |
|---|---|---|---|
| 1.0.0 | 2026-05-24 | Frontend Lead | Initial screen/module/API mapping baseline |

# Requirement to Diagram Coverage Matrix

## Purpose
Map intake traceability IDs to architecture diagrams so verification can happen without repetitive clarification.

## Diagram Legend
- D-01: 01-system-architecture-diagram.md
- D-02: 02-module-interaction-diagram.md
- D-03: 03-deployment-runtime-diagram.md
- D-04: 04-data-flow-and-pii-boundary-diagram.md
- D-05: 06-use-case-diagram.md
- D-06: 07-sequence-self-service-password-captcha-and-edit-request.md
- D-07: 08-sequence-import-dedup-and-merge.md
- D-08: 09-sequence-helpdesk-ticket-lifecycle.md
- D-09: 10-domain-entity-relationship-diagram.md
- D-10: 11-rbac-and-access-boundary-diagram.md
- D-11: 12-release-and-governance-flow-diagram.md
- D-12: 13-notification-workflow-sequence-diagram.md

## Intake Coverage Mapping
| Intake IDs | Requirement Area | Diagrams |
|---|---|---|
| TR-001 to TR-004 | Organizational hierarchy and governance | D-01, D-02, D-05, D-09 |
| TR-005 to TR-010 | Contact CRM, audit, search, soft-delete | D-01, D-02, D-04, D-09, D-10 |
| TR-011 to TR-015 | Import, mapping, dedup, merge, summary | D-01, D-02, D-07, D-09 |
| TR-016 to TR-019 | Programs, sessions, registration, waitlist | D-01, D-02, D-05, D-09 |
| TR-020 to TR-022 | Attendance capture, upload, reporting | D-01, D-02, D-05, D-09 |
| TR-023 to TR-024 | Helpdesk lifecycle (notifications deferred) | D-01, D-02, D-08 |
| TR-025 to TR-028 | Self-service credential+captcha login, edit requests, history | D-01, D-04, D-05, D-06 |
| TR-029 to TR-032 | Admin RBAC, credential+captcha login, dashboard, audit viewer | D-01, D-02, D-10 |
| TR-033 to TR-036 | Deferred notification workflow blueprint (future phase) | D-12 |
| TR-037 to TR-038 | Tech stack and data model | D-01, D-03, D-09 |
| TR-039 to TR-040 | Delivery and risk/compliance controls | D-11 |
| TR-041 to TR-050 | Deferred scope controls | D-11 |

## Verification Rule
If an intake item changes, update this matrix first, then update impacted diagrams and dependent documents.

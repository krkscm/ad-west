# Intake to SDLC Traceability Matrix (FR Re-Baseline)

## Baseline Objective
Re-baseline mapping directly from BRS functional requirements to in-scope modules only:
- M-01 Organizational Structure
- M-02 Master Contact List and CRM
- M-03 Import and Deduplication
- M-04 Program and Event Management
- M-05 Attendance
- M-06 Helpdesk
- M-07 Member Self-Service
- M-08 Admin RBAC
- Activated extension modules: M-09 Document and Report, M-10 Job Board and Resume, M-11 Approval Workflow

## Mapping Rules
- One row per coherent FR group from BRS.
- Use status values: Covered, In Progress, Complete, Deferred.
- Deferred means excluded from current phase by approved scope controls.
- n8n and messaging workflows are deferred in this phase.

| ID | BRS FR IDs | Scope Statement | Module | Core Business or Deferred | Acceptance Doc | Status |
|---|---|---|---|---|---|---|
| FRM-001 | FR-ORG-001 to FR-ORG-004 | Zone and Sreny definition, metadata, and configurable structure | M-01 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/03-module-01-org-structure-acceptance.md | Covered |
| FRM-002 | FR-ORG-005 | Sthan creation under Zone | M-01 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/03-module-01-org-structure-acceptance.md | Covered |
| FRM-003 | FR-ORG-006 to FR-ORG-008 | Sthan inheritance and full independence as later phase | M-01 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-004 | FR-ORG-009 | Pending-feature indicator for partial Sthan implementation | M-01 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/03-module-01-org-structure-acceptance.md | Covered |
| FRM-005 | FR-ORG-010 to FR-ORG-012 | Sreny internal governance model and annual cycle | M-01 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/03-module-01-org-structure-acceptance.md | Complete |
| FRM-006 | FR-ORG-013 | Service Sreny designation for helpdesk and job-board context | M-01 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/03-module-01-org-structure-acceptance.md | Covered |
| FRM-007 | FR-CRM-001 to FR-CRM-003 | Zone master contact authority and Sreny membership linking | M-02 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/04-module-02-contact-crm-acceptance.md | Covered |
| FRM-008 | FR-CRM-004 | Sreny-scoped custom metadata fields on contacts | M-02 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/04-module-02-contact-crm-acceptance.md | Complete |
| FRM-009 | FR-CRM-005 | Audit tracking on core contact field updates | M-02 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/04-module-02-contact-crm-acceptance.md | Covered |
| FRM-010 | FR-CRM-006 to FR-CRM-008 | Sthan contact sub-list behavior and cross-membership visibility | M-02 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-011 | FR-IMP-001 | Multi-format import baseline, constrained to Core Business formats | M-03 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/05-module-03-import-dedup-acceptance.md | Covered |
| FRM-012 | FR-IMP-002 to FR-IMP-003 | Import mapping interface and reusable mapping presets | M-03 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/05-module-03-import-dedup-acceptance.md | Covered |
| FRM-013 | FR-IMP-004 to FR-IMP-005 | Import validation and result reporting | M-03 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/05-module-03-import-dedup-acceptance.md | Covered |
| FRM-014 | FR-DUP-001 to FR-DUP-003 | Dedup rule engine with merge, skip, and import-as-new flow | M-03 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/05-module-03-import-dedup-acceptance.md | Covered |
| FRM-015 | FR-DUP-004 to FR-DUP-005 | Duplicate workspace and resolution reporting | M-03 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/05-module-03-import-dedup-acceptance.md | Covered |
| FRM-016 | FR-DUP-006 | Periodic dedup scan | M-03 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-017 | FR-DUP-007 | Merge propagation to related records | M-03 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/05-module-03-import-dedup-acceptance.md | Complete |
| FRM-018 | FR-SRN-001 to FR-SRN-006 | Sreny profile, governance assignment, and shared-membership visibility | M-01 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/03-module-01-org-structure-acceptance.md | Complete |
| FRM-019 | FR-SRN-007 | Service Sreny as cross-module enabler | M-01 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/03-module-01-org-structure-acceptance.md | Covered |
| FRM-020 | FR-SRN-008 | Service Sreny access includes job listing operations | M-01 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-021 | FR-PRG-001 | Program ownership and cross-Sreny participation model | M-04 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/06-module-04-program-event-acceptance.md | Covered |
| FRM-022 | FR-PRG-002 | Program duration types with recurring and custom schedule options | M-04 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-023 | FR-PRG-003 to FR-PRG-005 | Program structure, lifecycle, and sub-session management | M-04 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/06-module-04-program-event-acceptance.md | Covered |
| FRM-024 | FR-PRG-006 | Long-duration milestones | M-04 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-025 | FR-PRG-007 to FR-PRG-008 | Member registration and admin manual enrollment | M-04 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/06-module-04-program-event-acceptance.md | Covered |
| FRM-026 | FR-PRG-009 | Configurable program registration form fields | M-04 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-027 | FR-PRG-010 | Waitlist support | M-04 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/06-module-04-program-event-acceptance.md | Covered |
| FRM-028 | FR-PRG-011 | Registration confirmation via messaging workflows | M-04 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-029 | FR-ATT-001 to FR-ATT-004 | Session attendance capture and reporting views | M-05 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/07-module-05-attendance-acceptance.md | Covered |
| FRM-030 | FR-ATT-002 (QR entry method) | QR attendance check-in | M-05 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-031 | FR-ATT-005 | Attendance percentage thresholds for eligibility | M-05 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-032 | FR-ATT-006 | Attendance export to spreadsheet formats | M-05 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/07-module-05-attendance-acceptance.md | Covered |
| FRM-033 | FR-HD-001 to FR-HD-006 | Helpdesk intake, lifecycle, assignment, and activity logging | M-06 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/08-module-06-helpdesk-acceptance.md | Covered |
| FRM-034 | FR-HD-007 | Ticket status notifications through messaging workflows | M-06 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-035 | FR-HD-008 to FR-HD-009 | Helpdesk dashboards and searchable archive | M-06 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/08-module-06-helpdesk-acceptance.md | Complete |
| FRM-036 | FR-HD-010 | SLA timer and escalation controls | M-06 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-037 | FR-SP-001 to FR-SP-002 | Member verification and master-list matching | M-07 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/09-module-07-self-service-acceptance.md | Covered |
| FRM-038 | FR-SP-003 to FR-SP-004 | OTP identity flow in self-service | M-07 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-039 | FR-SP-005 to FR-SP-009 | Record view, edit request, and program-attendance history | M-07 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/09-module-07-self-service-acceptance.md | Covered |
| FRM-040 | FR-SP-010 to FR-SP-012 | Member helpdesk actions from self-service | M-07 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/09-module-07-self-service-acceptance.md | Covered |
| FRM-041 | FR-SP-013 to FR-SP-015 | Job-board actions in self-service | M-07 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-042 | FR-ADM-001 | Admin credential login gate | M-08 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/10-module-08-admin-rbac-acceptance.md | Covered |
| FRM-043 | FR-ADM-002 | Admin MFA requirement from BRS | M-08 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-044 | FR-ADM-003 to FR-ADM-005 | Dashboard priority widgets, shell section gating, and audit-log visibility | M-08 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/10-module-08-admin-rbac-acceptance.md | Covered |
| FRM-045 | FR-ADM-006 to FR-ADM-008 | Module-level permissions and custom role builder | M-08 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-046 | FR-ADM-009 | Time-bound role assignments | M-08 | Core Business | ad-docs/business-intake-modular/11-intake-coverage-pack/10-module-08-admin-rbac-acceptance.md | Covered |
| FRM-047 | FR-ADM-010 | Role expiry alerts through messaging workflow | M-08 | Deferred | ad-docs/business-intake-modular/11-intake-coverage-pack/12-deferred-scope-control-register.md | Covered |
| FRM-048 | FR-DOC-001 to FR-DOC-006 | Sreny document repository, folder hierarchy, file metadata, versioning, and role-scoped access control | M-09 | Core Business (Activated) | ad-docs/business-intake-modular/11-intake-coverage-pack/20-module-09-document-report-acceptance.md | Complete |
| FRM-049 | FR-DOC-007 to FR-DOC-010 | Configurable report templates, member submissions, and admin review workflow | M-09 | Core Business (Activated) | ad-docs/business-intake-modular/11-intake-coverage-pack/20-module-09-document-report-acceptance.md | Complete |
| FRM-050 | FR-JOB-001 to FR-JOB-006 | Job listing publish lifecycle, member visibility, expiry/archive handling, and interest expression | M-10 | Core Business (Activated) | ad-docs/business-intake-modular/11-intake-coverage-pack/21-module-10-job-board-resume-acceptance.md | Complete |
| FRM-051 | FR-JOB-007 to FR-JOB-010 | Resume upload/update lifecycle and moderator-searchable resume repository | M-10 | Core Business (Activated) | ad-docs/business-intake-modular/11-intake-coverage-pack/21-module-10-job-board-resume-acceptance.md | Complete |
| FRM-052 | FR-JOB-011 | Resume access privacy audit logging for moderator access | M-10 | Core Business (Activated) | ad-docs/business-intake-modular/11-intake-coverage-pack/21-module-10-job-board-resume-acceptance.md | Complete |
| FRM-053 | FR-APR-001 to FR-APR-006 | Approval workflow engine with configurable paths, audit trail, and escalation/notification controls | M-11 | Core Business (Activated) | ad-docs/business-intake-modular/11-intake-coverage-pack/22-module-11-approval-workflow-acceptance.md | Complete |

## Explicit Exclusions from This Matrix
- FR-MSG and FR-NOT groups remain outside active Core Business mapping for this phase.
- NFR groups remain tracked in risk/compliance and architecture coverage artifacts, not in this module FR matrix.

## Coverage Summary
- Total mapped FR groups: 53.
- Modules covered: M-01 to M-11 (with M-09 to M-11 as activated extension modules).
- Deferred groups controlled through deferred-scope register: 20.
- No mapping rows include n8n or messaging as active Core Business commitments.

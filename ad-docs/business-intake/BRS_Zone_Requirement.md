# Zone Community Management Platform - Combined BRS + Core Business (Implementation Aligned)

Version: 1.0
Date: May 25, 2026
Source Inputs:
- BRS_Zone_Requirement.md
- BRS_Zone_Remaining_Requirement.md
- Current API/Web implementation and database scripts in this repository

## 1. Purpose

This document combines the original BRS and Core Business plan into one implementation-aligned specification for the current development phase.

This phase is intentionally constrained to low-cost, directly buildable features.

## 2. Non-Negotiable Phase Constraints

1. No message broker integrations (no Kafka, RabbitMQ, SNS/SQS, Service Bus, etc.).
2. No n8n integrations.
3. No paid communication channel dependencies for this phase (no SMS/WhatsApp vendor dependency).
4. Prefer free/self-hosted/open-source-first choices.

## 3. Current Implementation Baseline (As Of May 25, 2026)

### 3.1 Platform Shape

- Backend is a NestJS API with a large Core Business module exposing endpoints for:
  - Org hierarchy (zones, srenies, sthans, governance)
  - Contacts, memberships, imports, duplicate handling
  - Programs, sessions, registrations, attendance
  - Helpdesk
  - Documents, reports
  - Job listings, resumes
  - Approval workflows
  - Member self-service APIs
- Web frontend includes:
  - Unified login (admin/member)
  - Admin dashboard shell with operational tabs and API-backed workflows
  - Member portal flow
- Database scripts define a substantial PostgreSQL schema and indexes for core business entities.

### 3.2 Current State Summary

- Significant functional coverage exists at API surface level.
- Some flows are currently demo/in-memory style in service layer behavior.
- Frontend includes operational controls for multiple modules, but not all areas are production-hardened end-to-end.

### 3.3 Latest Implementation Update (May 25, 2026)

- Implemented additional backend hardening for core runtime flows:
  - Program/session date-window validation.
  - Program publish preconditions.
  - Registration duplicate and capacity checks.
  - Attendance bulk-upload non-empty validation with optional late/excused counters.
  - Helpdesk ticket status-transition guardrails with assignment requirement.
- Added import reconciliation and finalization guardrails:
  - Import reconciliation summary endpoint.
  - Finalize import blocked until duplicate reconciliation is complete.
- Added import failure and listing operations:
  - Import list endpoint with status filtering.
  - Explicit import fail operation with reason tracking.
- Added helpdesk ticket activity-trail visibility endpoint and server-side activity capture.
- Added self-service edit-request validation hardening (field whitelist, current-value match, change requirement).
- Added production runtime safety guard requiring DB persistence mode in production.
- Added admin operational UI support for import failed-state handling and helpdesk ticket activity timeline loading.
- Added member portal error-message normalization for stronger user-facing failure clarity.
- Added Core Business persistence readiness endpoint and admin visibility panel for migration blockers and next steps.
- Added development handoff migration strategy and updated API/integration contracts to reflect implemented endpoints.
- Added dedicated admin tabs/components for import reconciliation and helpdesk ticket activity workflows.
- Expanded regression suite with finalized-import failure-state guard coverage.
- Added API unit tests validating these behaviors.
- Added CoreBusinessStore abstraction with in-memory and PostgreSQL adapters, including environment-based module wiring.
- Added Core Business runtime snapshot persistence migration and TypeORM-backed adapter integration.
- Expanded frontend regression with integration tests for import reconciliation and helpdesk ticket activity screens.
- Added authenticated DB-mode smoke validation covering seeded admin login and protected Core Business readiness access.
- Added duplicate merge propagation regression coverage across registrations, attendance, tickets, edit requests, and governance assignments.
- Removed demo state seeding from DB-mode Core Business startup and added regression proving empty DB-mode bootstrap without a snapshot.
- Added lock-serialized merge/finalize workflow protection to prevent interleaving during import reconciliation.

## 4. Combined Scope for Current Phase

## 4.1 In Scope (Build/Complete in Current Phase)

### Module A: Organizational Structure

- Zone CRUD basics
- Sreny CRUD basics
- Governance structure and assignment (year-based)
- Sthan basic records with explicit Phase-1 partial behavior

### Module B: Master Contact List + CRM

- Contact CRUD and search/filter
- Membership mapping across srenies
- Contact metadata at sreny level
- Soft-delete behavior
- Audit trail for key profile changes

### Module C: Import + Deduplication (Practical Core Business)

- CSV/XLSX import entry flow
- Duplicate candidate review queue
- Merge/skip/finalize flow
- Import summary and operational visibility

### Module D: Program + Session + Registration

- Program lifecycle at Core Business level (draft/publish/archive)
- Session creation/update
- Member registration and cancelation with waitlist state support

### Module E: Attendance

- Per-session attendance record and update
- Bulk upload path
- Report and export endpoint support

### Module F: Helpdesk

- Member ticket creation
- Admin list/search/assign/update
- Ticket comments and metrics

### Module G: Member Self-Service

- Member authenticated profile view
- Member edit request create/list
- Member program list
- Member helpdesk ticket list

### Module H: Admin + RBAC Foundations

- Captcha-protected login
- Role-scoped admin access
- Core admin workflows for contacts, tickets, approvals, and governance

## 4.2 Conditionally Included (Only If Time Allows in Current Phase)

- Document folders/files/versioning hardening
- Report templates/submissions review hardening
- Job listings/resume management hardening
- Approval workflow robustness and rule depth

These are already represented in API/UI scaffolding but should be treated as secondary to core CRM/program/helpdesk completion.

## 4.3 Out of Scope (Current Phase)

1. Any n8n workflow implementation.
2. Any message broker architecture or event bus dependency.
3. SMS/WhatsApp delivery integrations.
4. Complex multi-level orchestration tied to external workflow engines.

## 5. Functional Requirements - Consolidated and Trimmed

### 5.1 Organizational

- Configurable Zone/Sreny entities and governance structure.
- Annual governance changes must preserve history.
- Sthan remains Phase-1 partial with clear UX indication of deferred independence.

### 5.2 CRM + Contacts

- Single zone-level contact source of truth.
- Sreny membership links maintained as first-class relationship.
- Contact edits logged.

### 5.3 Import/Dedup

- Import supports CSV/XLSX.
- Duplicate resolution supports merge/skip/finalize.
- Maintain clear result summaries for operators.

### 5.4 Programs/Attendance

- Program and session management available to admin users.
- Registration and attendance tracking usable for real operations.

### 5.5 Helpdesk + Member Portal

- Verified members can create/track helpdesk tickets.
- Admins can assign, update, and comment on tickets.
- Members can request profile edits.

### 5.6 Admin + Security

- Captcha + credential authentication.
- Lockout and role-based access controls enforced.
- Admin auditability retained.

## 6. Technical Direction (Current Phase)

- Frontend: React + TypeScript.
- Backend: NestJS.
- Database: PostgreSQL schema already defined in repo scripts.
- Storage/session/cache: keep simple and low-cost; avoid introducing paid infra prematurely.
- Integration model: direct API/database flow without broker or n8n dependency.

## 7. Delivery Priority Order

1. Production-harden existing core (Org, Contacts, Import/Dedup).
2. Complete Programs/Attendance end-to-end reliability.
3. Complete Helpdesk + Member edit workflows end-to-end.
4. Stabilize Admin UX and reporting metrics.
5. Only then expand hardening of Documents/Reports/Jobs/Approvals.

## 8. Acceptance for Current Phase Completion

The current phase is complete when all below are true:

1. Core CRM + import/dedup works with persistent data and operational reliability.
2. Program, session, registration, attendance flows are stable in real usage.
3. Helpdesk member/admin workflows are complete and tested.
4. Member profile view + edit request loop is complete.
5. No dependencies on n8n, message brokers, or paid messaging integrations.

---

This file is the implementation-aligned replacement baseline for planning and execution in the current phase.


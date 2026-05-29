# Core Business Persistence Migration Strategy

## Purpose
Provide an executable migration plan from current in-memory Core Business runtime behavior to PostgreSQL-backed persistence for UAT and production readiness.

## Current Baseline
- Core Business module now uses a store abstraction with in-memory and PostgreSQL runtime adapters.
- PostgreSQL runtime mode persists full Core Business service state as a DB snapshot record.
- DB mode also hydrates seed-backed core runtime rows for zones, srenies, contacts, and memberships when no snapshot exists.
- Auth store can be DB-backed when ENABLE_DB_PERSISTENCE=true.
- Core Business production guard now blocks production startup when DB persistence is disabled.
- Persistence readiness endpoint is available at /api/v1/core/persistence/readiness.
- Core Business DB mode now mirrors zone, sreny, contact, membership, and contact-sreny metadata writes into PostgreSQL tables while preserving the existing API contract.
- Core Business DB mode now mirrors import batch and dedup candidate writes into PostgreSQL tables and hydrates them on startup when no snapshot exists.
- Core Business DB mode now mirrors program, session, registration, and attendance writes into PostgreSQL tables and hydrates them on startup when no snapshot exists.
- Core Business DB mode now mirrors helpdesk ticket and comment writes into PostgreSQL tables and hydrates them on startup when no snapshot exists.
- Core Business DB mode now mirrors document folder and document writes into PostgreSQL tables and hydrates them on startup when no snapshot exists.
- Core Business DB mode now mirrors report template/submission writes into PostgreSQL tables and hydrates them on startup when no snapshot exists.
- Core Business DB mode now mirrors job listing/interest/resume writes into PostgreSQL tables and hydrates them on startup when no snapshot exists.
- Core Business DB mode now mirrors approval workflow/item writes into PostgreSQL tables and hydrates them on startup when no snapshot exists.
- Approval module schema now includes additive runtime metadata columns required for DB parity (`mode`, `escalation_hours`, `due_at`, `escalation_count`, `last_escalated_at`, `audit_trail`).

## Migration Goal
Move Core Business entities and workflows to DB-backed repositories without breaking current API contracts or module acceptance behavior.

## Scope of Migration
1. Core entities:
   - zones, srenies, sthans, governance structures, governance assignments
   - contacts, memberships, import batches, dedup candidates
   - programs, sessions, registrations, attendance
   - helpdesk tickets, ticket comments, ticket activity
   - edit requests
2. Preserve existing API endpoints and payload contracts where possible.

## Phased Strategy

### Phase 1: Persistence Abstraction Layer
1. Introduce CoreBusinessStore interface for all write/read operations.
2. Keep InMemoryCoreBusinessStore as baseline implementation.
3. Add PostgresCoreBusinessStore as new implementation.
4. Wire store selection by environment gate in CoreBusinessModule.

Exit criteria:
- CoreBusinessService no longer directly owns mutable maps.
- Service logic composes store operations only.

Status: Completed in current increment (using DB snapshot adapter for runtime state persistence).

### Phase 2: Entity and Repository Mapping
1. Map Core Business models to existing adwest schema tables.
2. Add missing entity definitions where needed.
3. Implement repository operations with transactional safety on merge/finalize flows.

Exit criteria:
- Contacts/import/program/helpdesk/edit request flows persist in DB mode end-to-end.

Status: In progress. Merge/finalize workflows are now lock-protected in the current runtime and remain a direct DB repository target for the next phase.

### Phase 3: Data Migration and Backfill Validation
1. Prepare one-time migration/backfill script for local and UAT promotion.
2. Validate row counts and relationship integrity (registrations, attendance, ticket links).
3. Validate duplicate merge propagation integrity in DB mode.

Exit criteria:
- Reconciliation checks pass with no orphaned relation references.

### Phase 4: Regression and UAT Gate
1. Run API unit/integration regression suites in DB mode.
2. Run frontend integration checks against DB mode runtime.
3. Resolve all P1/P2 defects before UAT sign-off.

Exit criteria:
- Persistence readiness blockers reduced to zero.
- readyForUat=true criteria met by implementation gate.

## Required Guardrails
1. No message brokers.
2. No n8n integrations.
3. No SMS/WhatsApp paid integrations.
4. Backward-compatible contract changes only unless versioning approval is provided.

## Verification Checklist
- [x] Core Business store abstraction merged.
- [x] PostgresCoreBusinessStore implemented for core runtime persistence.
- [x] Merge/finalize workflows transaction-protected.
- [x] Persistence readiness endpoint reports no blockers when DB mode is active.
- [x] Regression suite includes DB-mode readiness coverage.
- [x] DB runtime no longer seeds demo data when no snapshot exists.
- [x] UAT smoke flows pass without in-memory dependencies.
- [x] Authenticated DB smoke also verifies the DB-backed `/org/zones` read path.
- [x] DB-backed contact create/update and membership persistence are covered by regression.
- [x] DB-backed import batch and dedup candidate persistence are covered by regression.
- [x] DB-backed program and attendance persistence are covered by regression.
- [x] DB-backed helpdesk ticket persistence is covered by regression.
- [x] DB-backed document folder and document persistence are covered by regression.
- [x] DB-backed report template/submission persistence is covered by regression.
- [x] DB-backed job listing/interest/resume persistence is covered by regression.
- [x] DB-backed approval workflow/item persistence is covered by regression.


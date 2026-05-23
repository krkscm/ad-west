# Module 02 Acceptance Baseline: Master Contact List and CRM

## In-Scope Capabilities
- Single Zone-level master contact list.
- Core contact fields and Sreny memberships.
- Soft-delete only behavior.
- Audit logging for key identity changes.
- Search and filter at database level.

## Acceptance Criteria
- Contact create/edit supports all required core fields.
- One contact can belong to multiple Srenies.
- Soft-delete hides records from normal list and is recoverable.
- Name, phone, and email changes generate audit log entries.
- Search and filter return expected results without Elasticsearch.

## Exclusions to Enforce
- Elasticsearch-powered search.

## Test Evidence Checklist
- [ ] CRUD test evidence.
- [ ] Membership relation tests.
- [ ] Audit log validation.
- [ ] Search/filter performance checks.

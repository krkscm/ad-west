# Module 02 Acceptance Baseline: Master Contact List and CRM

## In-Scope Capabilities
- Single Zone-level master contact list.
- Core contact fields and Sreny memberships.
- Sreny-scoped custom metadata fields on contacts.
- Soft-delete only behavior.
- Audit logging for key identity changes.
- Search and filter at database level.

## Acceptance Criteria
- Contact create/edit supports all required core fields.
- One contact can belong to multiple Srenies.
- Contact supports per-Sreny metadata upsert constrained to active Sreny memberships.
- Soft-delete hides records from normal list and is recoverable.
- Name, phone, and email changes generate audit log entries.
- Search and filter return expected results without Elasticsearch.

## Exclusions to Enforce
- Elasticsearch-powered search.

## Test Evidence Checklist
- [x] CRUD test evidence.
- [x] Membership relation tests.
- [x] Audit log validation.
- [x] Search/filter performance checks.

## Implementation Evidence
- API DTO support added for `customMetadataBySreny` on contact create/update and dedicated metadata upsert payload.
- Endpoint added: `PATCH /api/v1/contacts/{contactId}/srenies/{srenyId}/metadata`.
- Service enforces membership-scoped metadata keys and prunes stale metadata when memberships change.
- Admin UI now includes an Ops Coverage flow to execute contact Sreny metadata upsert (FRM-008) from the dashboard.
- Database migration added: `ad-docs/database-script/014_core_business_frm_008_017_035_persistence.sql` with `contact_sreny_metadata` table, membership-guard trigger, and JSONB index.
- Added per-Sreni master contact-list ingestion with template-based header normalization and strict master-header validation (`/api/v1/org/sreni-definitions/:sreniId/contacts/upload`).
- Added `ad-docs/database-script/030_sreni_contacts.sql` to persist master-contact rows in a single JSONB-backed table (`adwest.sreni_contacts`) for all Srenies.
- Added downloadable master template artifact at `ad-west-web/public/templates/master-sreni-contact-template.xlsx` and exposed it from the Sreni Contacts screen for operator use.

## Endpoint-Level Test Evidence (2026-05-24)
- FRM-008 metadata upsert request/response:

```http
PATCH /api/v1/contacts/ct_qhxlltse/srenies/sreny_b0avop2z/metadata
Authorization: Bearer <admin-token>
Content-Type: application/json

{
	"metadata": {
		"committee": "membership",
		"dutyWindow": "weekday-evening",
		"designation": "coordinator"
	}
}
```

```json
{
	"contactId": "ct_qhxlltse",
	"srenyId": "sreny_b0avop2z",
	"metadata": {
		"committee": "membership",
		"dutyWindow": "weekday-evening",
		"designation": "coordinator"
	}
}
```


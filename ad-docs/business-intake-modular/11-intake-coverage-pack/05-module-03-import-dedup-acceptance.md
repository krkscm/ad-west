# Module 03 Acceptance Baseline: Contact Import and Deduplication

## In-Scope Capabilities
- CSV and XLSX import.
- Mapping wizard with reusable mapping profiles.
- Dedup by normalized phone and case-insensitive email.
- Duplicate resolution UI with merge, skip, and import-new.
- Import summary report.

## Acceptance Criteria
- Only CSV and XLSX files are accepted.
- Mapping profiles can be saved and reused.
- Duplicate detection applies phone and email rules accurately.
- Resolution workflow updates the final imported dataset correctly.
- Summary report includes counts for new, merged, and skipped records.
- Merge decision propagates survivor contact ID across related records.

## Exclusions to Enforce
- Fuzzy name deduplication.
- Periodic auto dedup scanning.
- VCF, Google Sheets, and JSON import.

## Test Evidence Checklist
- [x] Sample file import evidence.
- [x] Duplicate rule test evidence.
- [x] Resolution-path test evidence.
- [x] Import summary accuracy check.

## Implementation Evidence
- Merge flow now calls relation propagation before marking duplicate as merged.
- Propagation includes programs/registrations, attendance records, helpdesk tickets, member edit requests, and governance assignments.
- Merged contact is soft-deleted (`status: deleted`) after relation repointing to the survivor.
- Admin UI now includes an Ops Coverage action that runs import plus first-duplicate merge to validate FRM-017 behavior.
- Database migration added: `ad-docs/database-script/014_core_business_frm_008_017_035_persistence.sql` with `contact_merge_events` table and `adwest.merge_contacts(...)` propagation routine.
- Service regression now proves relation propagation across registrations, attendance, tickets, edit requests, and governance assignments.

## Endpoint-Level Test Evidence (2026-05-24)
- FRM-017 import to duplicate merge propagation:

```http
POST /api/v1/imports/contacts
Authorization: Bearer <admin-token>
Content-Type: application/json

{
	"fileType": "csv",
	"fileName": "merge-propagation-evidence.csv",
	"hasHeader": true
}
```

```json
{
	"importId": "imp_48d2qc0s",
	"status": "ready_for_review"
}
```

```http
GET /api/v1/imports/imp_48d2qc0s/duplicates
Authorization: Bearer <admin-token>
```

```json
{
	"duplicateId": "dup_0fe4rhk5",
	"leftContactId": "ct_yxlyg0ij",
	"rightContactId": "ct_uox4iati",
	"decisionBefore": "pending"
}
```

```http
POST /api/v1/imports/imp_48d2qc0s/duplicates/dup_0fe4rhk5/merge
Authorization: Bearer <admin-token>
```

```json
{
	"success": true,
	"postMerge": {
		"mergedContactStatus": "deleted",
		"registrationsOnSurvivor": 0,
		"ticketsOnSurvivor": 0,
		"ticketsOnMerged": 0
	}
}
```


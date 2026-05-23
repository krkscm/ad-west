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

## Exclusions to Enforce
- Fuzzy name deduplication.
- Periodic auto dedup scanning.
- VCF, Google Sheets, and JSON import.

## Test Evidence Checklist
- [ ] Sample file import evidence.
- [ ] Duplicate rule test evidence.
- [ ] Resolution-path test evidence.
- [ ] Import summary accuracy check.

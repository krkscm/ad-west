# Sequence Diagram: Import, Dedup, and Merge

## Scope
Admin flow for contact import, duplicate detection, and merge decision handling.

```mermaid
sequenceDiagram
  autonumber
  participant A as Admin
  participant UI as Admin Portal
  participant API as NestJS API
  participant IMP as Import Service
  participant DEDUP as Dedup Service
  participant DB as PostgreSQL

  A->>UI: Upload CSV/XLSX file
  UI->>API: Create import batch
  API->>IMP: Parse and validate mapped columns
  IMP->>DB: Persist ImportBatch and staged rows

  IMP->>DEDUP: Run dedup(phone normalized, email case-insensitive)
  DEDUP->>DB: Query existing contacts
  DB-->>DEDUP: Candidate matches
  DEDUP-->>UI: Duplicate candidate list

  A->>UI: Choose merge/skip/import-new per candidate
  UI->>API: Submit resolutions
  API->>DB: Apply updates and inserts
  API->>DB: Save import summary metrics
  API-->>UI: Import summary report
```

## Verification Checklist
- [ ] Accepted file types limited to CSV and XLSX.
- [ ] Dedup rules match intake scope (no fuzzy matching).
- [ ] Resolution outcomes are traceable in summary report.

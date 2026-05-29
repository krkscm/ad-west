# Deferred Scope Control Register

## Purpose
Prevent scope creep by explicitly controlling all post-Core Business items listed in business intake.

| ID | Deferred Item | Reason | Control Rule | Exception Approval Required | Status |
|---|---|---|---|---|---|
| DS-001 | Job Board and Resume | Scope activated by sponsor direction on 2026-05-24 | Move to active implementation and track in module acceptance | Sponsor | Activated |
| DS-002 | Broadcast Center | External dependency and approvals | Reject from Core Business backlog | Sponsor | Controlled |
| DS-003 | Document repository and submissions | Scope activated by sponsor direction on 2026-05-24 | Move to active implementation and track in module acceptance | Product Owner | Activated |
| DS-004 | Multi-level approval engine | Scope activated by sponsor direction on 2026-05-24 | Move to active implementation and track in module acceptance | Sponsor | Activated |
| DS-005 | Fuzzy dedup matching | Deferred complexity | Use phone and email rules only | Product Owner | Controlled |
| DS-006 | QR attendance | Nice to have | Use manual and CSV attendance only | Product Owner | Controlled |
| DS-007 | Recurring schedules | Deferred complexity | Use single or multi-day events only | Product Owner | Controlled |
| DS-008 | Sthan sub-Sreny independence | Phase 2 in BRS | Keep out of Core Business implementation | Sponsor | Controlled |
| DS-009 | Custom role builder | Fixed role model in Core Business | Reject in Core Business | Sponsor | Controlled |
| DS-010 | Arabic and Malayalam localization | Phase 2 | Keep English only in Core Business | Sponsor | Controlled |
| DS-011 | Elasticsearch contact search | Not needed in Core Business | Use DB search and filter only | Tech Lead | Controlled |
| DS-012 | Messaging workflows (email, WhatsApp, SMS) | Current phase excludes messaging system by product directive | Reject from active backlog in this phase | Sponsor | Controlled |
| DS-013 | Periodic dedup scan | Deferred optimization | Manual import dedup only | Product Owner | Controlled |
| DS-014 | n8n workflow integration | Current phase excludes n8n by product directive | Reject from active backlog in this phase | Sponsor | Controlled |

## Change Rule
No deferred item can enter Core Business without signed Sponsor approval and updated impact analysis.

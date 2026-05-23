# Deferred Scope Control Register

## Purpose
Prevent scope creep by explicitly controlling all post-MVP items listed in business intake.

| ID | Deferred Item | Reason | Control Rule | Exception Approval Required | Status |
|---|---|---|---|---|---|
| DS-001 | Job Board and Resume | Not core to dedup pain point | Reject from MVP backlog | Sponsor | Controlled |
| DS-002 | Broadcast Center | External dependency and approvals | Reject from MVP backlog | Sponsor | Controlled |
| DS-003 | Document repository and submissions | Not MVP critical | Keep in post-MVP list | Product Owner | Controlled |
| DS-004 | Multi-level approval engine | Simplified to approve/reject | Reject feature requests in MVP | Sponsor | Controlled |
| DS-005 | Fuzzy dedup matching | Deferred complexity | Use phone and email rules only | Product Owner | Controlled |
| DS-006 | QR attendance | Nice to have | Use manual and CSV attendance only | Product Owner | Controlled |
| DS-007 | Recurring schedules | Deferred complexity | Use single or multi-day events only | Product Owner | Controlled |
| DS-008 | Sthan sub-Sreny independence | Phase 2 in BRS | Keep out of MVP implementation | Sponsor | Controlled |
| DS-009 | Custom role builder | Fixed role model in MVP | Reject in MVP | Sponsor | Controlled |
| DS-010 | Arabic and Malayalam localization | Phase 2 | Keep English only in MVP | Sponsor | Controlled |
| DS-011 | Elasticsearch contact search | Not needed in MVP | Use DB search and filter only | Tech Lead | Controlled |
| DS-012 | WhatsApp and SMS notifications | External BSP dependency | Use email only workflows | Sponsor | Controlled |
| DS-013 | Periodic dedup scan | Deferred optimization | Manual import dedup only | Product Owner | Controlled |

## Change Rule
No deferred item can enter MVP without signed Sponsor approval and updated impact analysis.

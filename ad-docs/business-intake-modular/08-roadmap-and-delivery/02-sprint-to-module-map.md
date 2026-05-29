# Sprint to Module Map

## Scope Baseline
- Source mapping: 11-intake-coverage-pack/02-intake-to-sdlc-traceability-matrix.md.
- Module scope: M-01 to M-08 only.
- Deferred controls apply as defined in 11-intake-coverage-pack/12-deferred-scope-control-register.md.

## Effort Tags by Module

| Module | FRM Coverage | Effort Tag |
|---|---|---|
| M-01 Organizational Structure | FRM-001,002,004,005,006,018,019 | L |
| M-02 Contact CRM | FRM-007,008,009 | L |
| M-03 Import and Dedup | FRM-011,012,013,014,015,017 | XL |
| M-04 Program and Event | FRM-021,023,025,027 | L |
| M-05 Attendance | FRM-029,032 | M |
| M-06 Helpdesk | FRM-033,035 | M |
| M-07 Member Self-Service | FRM-037,039,040 | M |
| M-08 Admin RBAC | FRM-042,044,046 | M |

Effort tag scale: XS (0.5-1d), S (1-2d), M (3-5d), L (6-8d), XL (9+d).

## Sprint Blocks

| Sprint Block | Primary Focus | Related Modules |
|---|---|---|
| Sprint 1-2 | Foundation and auth | M-01, M-08 |
| Sprint 3-4 | Contact core and dedup | M-02, M-03 |
| Sprint 5-6 | Programs and attendance | M-04, M-05 |
| Sprint 7 | Self-service | M-07 |
| Sprint 8 | Helpdesk and wrap-up | M-06, M-08 |

## Sprint Scope by FRM

| Sprint Block | FRM Groups in Scope |
|---|---|
| Sprint 1-2 | FRM-001, FRM-002, FRM-004, FRM-005, FRM-006, FRM-018, FRM-019, FRM-042, FRM-044, FRM-046 |
| Sprint 3-4 | FRM-007, FRM-008, FRM-009, FRM-011, FRM-012, FRM-013, FRM-014, FRM-015, FRM-017 |
| Sprint 5-6 | FRM-021, FRM-023, FRM-025, FRM-027, FRM-029, FRM-032 |
| Sprint 7 | FRM-037, FRM-039, FRM-040 |
| Sprint 8 | FRM-033, FRM-035, FRM-042, FRM-044, FRM-046 |

## Exclusions for Current Phase
- Deferred FRM groups remain out of sprint execution unless change-control approval is recorded.
- No n8n or messaging workflow activation in current phase.

# Module Interaction Diagram

## Scope
Interaction boundaries across MVP modules M-01 to M-08.

## Source Alignment
- business-intake-modular/03-functional-modules/01-module-catalog.md
- business-intake-modular/09-development-handoff/02-module-to-sdlc-phase-map.md

## Diagram Notes
- The diagram focuses on module-level interaction, not class-level internals.
- Arrows represent primary dependency or data flow direction.

```mermaid
flowchart LR
  M1[M-01 Organizational Structure]
  M2[M-02 Master Contact CRM]
  M3[M-03 Import and Deduplication]
  M4[M-04 Program and Event Management]
  M5[M-05 Attendance]
  M6[M-06 Helpdesk]
  M7[M-07 Member Self-Service]
  M8[M-08 Admin RBAC]

  M1 --> M2
  M3 --> M2
  M2 --> M4
  M4 --> M5
  M7 --> M2
  M7 --> M4
  M7 --> M5
  M7 --> M6

  M8 --> M1
  M8 --> M2
  M8 --> M3
  M8 --> M4
  M8 --> M5
  M8 --> M6
  M8 --> M7

  M6 --> M2
  M6 --> M8

  classDef core fill:#e8f4fd,stroke:#1f77b4,color:#111;
  classDef auth fill:#fff3cd,stroke:#b8860b,color:#111;
  class M1,M2,M3,M4,M5,M6,M7 core;
  class M8 auth;
```

## Verification Checklist
- [ ] All eight MVP modules are represented.
- [ ] Dependency directions match current product behavior.
- [ ] RBAC control boundary is clearly visible.
- [ ] Self-service and helpdesk interaction paths are accurate.

## Change Log
| Version | Date | Updated By | Summary | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-05-23 | Architecture Owner | Initial module interaction baseline | Sponsor |

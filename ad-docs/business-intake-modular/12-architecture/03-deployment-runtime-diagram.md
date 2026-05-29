# Deployment and Runtime Diagram

## Scope
Runtime deployment view for Core Business infrastructure and integration boundaries.

## Source Alignment
- business-intake/BRS_Zone_Requirement.md
- business-intake/BRS_Zone_Remaining_Requirement.md
- business-intake-modular/06-integrations-and-automation/03-environment-readiness-checklist.md

## Diagram Notes
- This diagram shows containerized services and external dependency boundaries.
- Network segmentation can be refined later during infrastructure hardening.

```mermaid
flowchart TB
  subgraph USERS[Users]
    MU[Member User]
    AU[Admin User]
  end

  subgraph EDGE[Edge]
    LB[Load Balancer or Reverse Proxy]
  end

  subgraph APP[Application Runtime - Docker Compose]
    FE[Frontend App\nReact + TypeScript]
    API[NestJS API]
  end

  subgraph DATA[Stateful Services]
    PG[(PostgreSQL)]
    RD[(Redis)]
    MN[(MinIO)]
  end

  subgraph EXT[External Services]
    MAIL[Email Provider]
  end

  MU --> LB
  AU --> LB

  LB --> FE
  LB --> API

  FE --> API
  API --> PG
  API --> RD
  API --> MN
  API --> MAIL

  classDef edge fill:#fdecec,stroke:#c0392b,color:#111;
  classDef app fill:#e8f4fd,stroke:#1f77b4,color:#111;
  classDef data fill:#eef7ee,stroke:#2e8b57,color:#111;
  classDef ext fill:#fff3cd,stroke:#b8860b,color:#111;

  class LB edge;
  class FE,API app;
  class PG,RD,MN data;
  class MAIL,MU,AU ext;
```

## Verification Checklist
- [ ] Runtime services reflect Core Business stack decisions.
- [ ] Data stores match approved architecture baseline.
- [ ] No n8n or message-broker dependency is represented.
- [ ] Authentication boundary is represented (password + captcha + lockout).

## Change Log
| Version | Date | Updated By | Summary | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-05-23 | Architecture Owner | Initial deployment/runtime baseline | Sponsor |
| 1.1.0 | 2026-05-25 | Architecture Owner | Removed n8n runtime dependency from current-phase baseline | Sponsor |

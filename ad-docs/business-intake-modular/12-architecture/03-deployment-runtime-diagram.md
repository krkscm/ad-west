# Deployment and Runtime Diagram

## Scope
Runtime deployment view for MVP infrastructure and integration boundaries.

## Source Alignment
- business-intake/BRS_Zone_MVP_Plan.md
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
    N8N[n8n Service]
  end

  subgraph DATA[Stateful Services]
    PG[(PostgreSQL)]
    RD[(Redis)]
    MN[(MinIO)]
  end

  subgraph EXT[External Services]
    MAIL[Email Provider]
    OTP[Authenticator App\nTOTP]
  end

  MU --> LB
  AU --> LB

  LB --> FE
  LB --> API

  FE --> API
  API --> PG
  API --> RD
  API --> MN
  API --> N8N

  N8N --> MAIL
  API --> OTP

  classDef edge fill:#fdecec,stroke:#c0392b,color:#111;
  classDef app fill:#e8f4fd,stroke:#1f77b4,color:#111;
  classDef data fill:#eef7ee,stroke:#2e8b57,color:#111;
  classDef ext fill:#fff3cd,stroke:#b8860b,color:#111;

  class LB edge;
  class FE,API,N8N app;
  class PG,RD,MN data;
  class MAIL,OTP,MU,AU ext;
```

## Verification Checklist
- [ ] Runtime services reflect MVP stack decisions.
- [ ] Data stores match approved architecture baseline.
- [ ] n8n and email integration boundary is clear.
- [ ] Authentication and MFA boundary is represented.

## Change Log
| Version | Date | Updated By | Summary | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-05-23 | Architecture Owner | Initial deployment/runtime baseline | Sponsor |

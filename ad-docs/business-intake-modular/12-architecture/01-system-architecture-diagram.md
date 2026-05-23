# System Architecture Diagram

## Scope
ADWest Zone Community Management Platform MVP (Modules 1 to 8).

## Source Alignment
- business-intake/BRS_Zone_MVP_Plan.md
- business-intake-modular/03-functional-modules/01-module-catalog.md

## Diagram Notes
- This is the baseline architecture for planning and stakeholder verification.
- Keep the diagram updated when integration, security, or deployment boundaries change.
- Use the change log section at the end for controlled revisions.

```mermaid
flowchart LR
  U1[Member User]
  U2[Admin User]

  subgraph FE[Frontend Layer]
    SS[Self-Service Portal\nReact + TypeScript]
    AP[Admin Portal\nReact + TypeScript]
  end

  subgraph BE[Backend Layer]
    API[NestJS API\nModules 1-8]
    AUTH[Auth + RBAC + MFA\nJWT + TOTP]
    CRM[Contact + Dedup Services]
    EVT[Program + Attendance Services]
    HD[Helpdesk Services]
    AUD[Audit Logging]
  end

  subgraph DATA[Data and Storage]
    PG[(PostgreSQL)]
    RD[(Redis)]
    MN[(MinIO)]
  end

  subgraph AUTO[Automation]
    N8N[n8n Workflows\nN8N-COM-013/004/005/002]
    MAIL[Email Provider]
  end

  U1 --> SS
  U2 --> AP
  SS --> API
  AP --> API

  API --> AUTH
  API --> CRM
  API --> EVT
  API --> HD
  API --> AUD

  AUTH --> RD
  CRM --> PG
  EVT --> PG
  HD --> PG
  AUD --> PG
  API --> MN

  API --> N8N
  N8N --> MAIL
  MAIL --> U1
  MAIL --> U2

  classDef ext fill:#fff3cd,stroke:#b8860b,color:#333;
  classDef core fill:#e8f4fd,stroke:#1f77b4,color:#111;
  classDef data fill:#eef7ee,stroke:#2e8b57,color:#111;

  class U1,U2,MAIL ext;
  class SS,AP,API,AUTH,CRM,EVT,HD,AUD,N8N core;
  class PG,RD,MN data;
```

## Verification Checklist
- [ ] Module boundaries match current module catalog.
- [ ] Security controls (JWT, RBAC, TOTP) are represented.
- [ ] Data stores (PostgreSQL, Redis, MinIO) are represented.
- [ ] n8n workflow boundary and email-only notification model are represented.
- [ ] Diagram reflects current MVP constraints.

## Change Log
| Version | Date | Updated By | Summary | Approved By |
|---|---|---|---|---|
| 1.0.0 | 2026-05-23 | Architecture Owner | Initial modular architecture baseline | Sponsor |

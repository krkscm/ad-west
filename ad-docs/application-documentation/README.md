# ADWest Application Documentation

Architecture and runtime reference for the live ADWest implementation.

**Last aligned with codebase:** 2026-06-10 (migrations through `078`)

## Document index

| # | Document | Topics |
|---|----------|--------|
| 01 | [system-overview](./01-system-overview.md) | Stack, user domains, functional areas |
| 02 | [backend-architecture](./02-backend-architecture.md) | NestJS modules, services, API surface |
| 03 | [frontend-architecture](./03-frontend-architecture.md) | Routes, pages, API wrappers, UI patterns |
| 04 | [auth-and-google-integration](./04-auth-and-google-integration.md) | Login, sessions, access layers, integrations |
| 05 | [public-gateway-and-member-services](./05-public-gateway-and-member-services.md) | Public intake, member services, join-us |
| 06 | [data-and-migrations](./06-data-and-migrations.md) | Tables, migration chain, bootstrap vs SQL |
| 07 | [runtime-and-deployment](./07-runtime-and-deployment.md) | Local dev, env vars, operational checklist |
| 08 | [performance-and-security-baselines](./08-performance-and-security-baselines.md) | Throttling, validation, headers |

### Diagrams

- [adwest-architecture.svg](./diagrams/adwest-architecture.svg)
- [backend-contact-location-hierarchy.md](./diagrams/backend-contact-location-hierarchy.md)
- [frontend-governance-contacts-flow.md](./diagrams/frontend-governance-contacts-flow.md)

## Source inputs

- API: `ad-west-api/`
- Web: `ad-west-web/`
- Migrations: `ad-docs/database-script/`

## Source-of-truth policy

1. **Runtime behavior** is owned by application code.
2. **Persistent schema** is owned by ordered SQL scripts (plus documented bootstrap DDL in `core-business-db-bootstrap.service.ts` for idempotent dev startup).
3. If code and docs diverge, update docs from code immediately.

## Recent feature areas (2026)

These are fully covered in chapters 02–06:

- Member data Excel upload (household + child rows, preview/commit)
- Contact access scope (permission sets, ZONE/STHAN role levels)
- Seva Samithi contact registry and seva activity tracking
- Gada (Gadanayak) assignment per Sreni
- Join Us public intake and admin review queue
- Household members, enrollments, and participant strategies (Balabarathi / ladies)

# ADWest Application Documentation

This directory is the architecture and runtime reference for the live ADWest implementation.

Prepared on: 2026-06-04

## Document Index

1. [01-system-overview.md](./01-system-overview.md)
2. [02-backend-architecture.md](./02-backend-architecture.md)
3. [03-frontend-architecture.md](./03-frontend-architecture.md)
4. [04-auth-and-google-integration.md](./04-auth-and-google-integration.md)
5. [05-public-gateway-and-member-services.md](./05-public-gateway-and-member-services.md)
6. [06-data-and-migrations.md](./06-data-and-migrations.md)
7. [07-runtime-and-deployment.md](./07-runtime-and-deployment.md)
8. [08-performance-and-security-baselines.md](./08-performance-and-security-baselines.md)
9. [diagrams/adwest-architecture.svg](./diagrams/adwest-architecture.svg)
10. [diagrams/backend-contact-location-hierarchy.md](./diagrams/backend-contact-location-hierarchy.md)
11. [diagrams/frontend-governance-contacts-flow.md](./diagrams/frontend-governance-contacts-flow.md)

## Source Inputs

- API implementation: `ad-west-api`
- Web implementation: `ad-west-web`
- Database migrations: `ad-docs/database-script`

## Documentation Intent

- Describe current architecture and runtime behavior, not planned ideas.
- Keep module boundaries explicit and maintain anti-monolith service composition.
- Preserve parity with code and migrations.

## Source-of-Truth Policy

- Runtime behavior is owned by code in `ad-west-api` and `ad-west-web`.
- Data model behavior is owned by ordered SQL scripts in `ad-docs/database-script`.
- If code and docs diverge, update docs from code immediately.

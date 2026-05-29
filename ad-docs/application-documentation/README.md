# ADWest Application Documentation (Reverse Engineered)

This documentation set is generated from the currently implemented code in:
- `ad-west-api`
- `ad-west-web`
- `ad-docs/database-script`

Prepared on: 2026-05-29

## Document Index

1. [01-system-overview.md](./01-system-overview.md)
2. [02-backend-architecture.md](./02-backend-architecture.md)
3. [03-frontend-architecture.md](./03-frontend-architecture.md)
4. [04-auth-and-google-integration.md](./04-auth-and-google-integration.md)
5. [05-public-gateway-and-member-services.md](./05-public-gateway-and-member-services.md)
6. [06-data-and-migrations.md](./06-data-and-migrations.md)
7. [07-runtime-and-deployment.md](./07-runtime-and-deployment.md)
8. [diagrams/adwest-architecture.svg](./diagrams/adwest-architecture.svg)

## Scope

This set covers the live runtime architecture, module boundaries, auth/session behavior, public gateway behavior, and deployment/runtime configuration as currently implemented.

## Source-of-Truth Policy

- Runtime behavior is defined by code in `ad-west-api` and `ad-west-web`.
- Database behavior is defined by ordered scripts in `ad-docs/database-script`.
- If this documentation conflicts with code, update documentation from code again.

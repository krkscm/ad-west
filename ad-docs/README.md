# ADWest Documentation Map

This folder holds **executable database migrations**, **application architecture docs**, and **working templates** for the ADWest platform.

## Repository layout

| Path | Purpose |
|------|---------|
| `application-documentation/` | Current implementation reference (architecture, auth, runtime) |
| `database-script/` | Ordered PostgreSQL migration scripts (`000`–`078`) |
| `templates/` | Change-request, test-case, requirement, and meeting-note templates |

## Application documentation (start here)

- [application-documentation/README.md](./application-documentation/README.md) — index and source-of-truth policy
- [01-system-overview.md](./application-documentation/01-system-overview.md)
- [02-backend-architecture.md](./application-documentation/02-backend-architecture.md)
- [03-frontend-architecture.md](./application-documentation/03-frontend-architecture.md)
- [04-auth-and-google-integration.md](./application-documentation/04-auth-and-google-integration.md)
- [05-public-gateway-and-member-services.md](./application-documentation/05-public-gateway-and-member-services.md)
- [06-data-and-migrations.md](./application-documentation/06-data-and-migrations.md)
- [07-runtime-and-deployment.md](./application-documentation/07-runtime-and-deployment.md)
- [08-performance-and-security-baselines.md](./application-documentation/08-performance-and-security-baselines.md)

### Diagrams

- [diagrams/adwest-architecture.svg](./application-documentation/diagrams/adwest-architecture.svg)
- [diagrams/backend-contact-location-hierarchy.md](./application-documentation/diagrams/backend-contact-location-hierarchy.md)
- [diagrams/frontend-governance-contacts-flow.md](./application-documentation/diagrams/frontend-governance-contacts-flow.md)

## Database migrations

- [database-script/README.md](./database-script/README.md) — run order, execution commands, operational warnings
- Supabase shortcut: [database-script/supabase/MIGRATE.md](./database-script/supabase/MIGRATE.md) (when present)

## Code sources of truth

| Concern | Owner |
|---------|--------|
| Runtime API behavior | `ad-west-api/src/` |
| Admin/member/public UI | `ad-west-web/src/` |
| Schema and seed data | `ad-docs/database-script/*.sql` |

When code and docs diverge, **update docs from code** in the same delivery cycle.

## Documentation maintenance rules

- Keep each file focused on one layer or domain.
- Describe **current** behavior, not planned features.
- New schema changes require a new numbered SQL script **and** an update to `06-data-and-migrations.md`.
- New admin routes or contact flows require updates to chapters `02`, `03`, and the relevant diagram.

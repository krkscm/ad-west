# 06 - Data and Migration Map

## Database Platform

- PostgreSQL only

## Migration Source

Ordered SQL scripts in `ad-docs/database-script` are the canonical migration source.

## Current Migration Coverage Highlights

- Core schema, indexes, triggers
- Auth store and security hardening
- Documents/jobs/approval persistence
- Runtime state store and metadata tables
- Roles, permissions, users, menu management
- Sreni contacts/calendar/attendance enhancements
- Public gateway persistence
- Member services persistence
- Google integration configuration persistence
- Member-services audit-FK relaxation for mixed persistence runtime
- Report metric target extension

## Latest Included Scripts

- `041_google_integration_config.sql`
- `042_drop_audit_fks.sql`
- `043_report_metric_target.sql`
- `044_sreni_analytics_menu.sql`

Script intent summary:
- `041_google_integration_config.sql`: DB-backed Google OAuth/Gmail configuration and settings menu seed
- `042_drop_audit_fks.sql`: Drops selected member-services audit FK constraints to avoid runtime write failures in mixed persistence/admin-origin scenarios
- `043_report_metric_target.sql`: Adds `target` field to report metric definitions for target-vs-actual reporting
- `044_sreni_analytics_menu.sql`: Backfills `Analytics Studio` child menu (`sreni-<id>-analytics`) for all existing Srenis

## Operational Guidance

- Use forward-only additive migrations.
- Keep migration order deterministic across environments.
- Prefer idempotent DDL when practical.

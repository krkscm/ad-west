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

- `043_report_metric_target.sql`
- `044_sreni_analytics_menu.sql`
- `045_sthan_menus_reports_expenses_contacts.sql`
- `046_governance_menu_access_control.sql`
- `047_location_report_metrics_scope.sql`
- `048_fix_sthan_table_types.sql`
- `049_sthan_contacts.sql`

Script intent summary:
- `043_report_metric_target.sql`: Adds `target` field to report metric definitions for target-vs-actual reporting
- `044_sreni_analytics_menu.sql`: Backfills `Analytics Studio` child menu (`sreni-<id>-analytics`) for all existing Srenis
- `045_sthan_menus_reports_expenses_contacts.sql`: Adds Sthan persistence tables and backfills parent/child Sthan menu keys
- `046_governance_menu_access_control.sql`: Normalizes `governance` menu hierarchy and reparents `insights`, `my-approvals`, and `settings-responsibility-chart` for grant-driven access control
- `047_location_report_metrics_scope.sql`: Adds `scope` discriminator (`sreni` / `location`) to report metric definitions and retires standalone Sthan metric table
- `048_fix_sthan_table_types.sql`: Recreates Sthan report/expense tables with UUID `location_id`, repairs optional `sreni_contacts.location_id`, and finalizes nullable `sreni_id` behavior
- `049_sthan_contacts.sql`: Adds dedicated `sthan_contacts` table for standalone per-Sthan Excel-uploaded contact rows

## Operational Guidance

- Use forward-only additive migrations.
- Keep migration order deterministic across environments.
- Prefer idempotent DDL when practical.

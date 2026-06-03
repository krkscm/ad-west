# 06 - Data and Migration Map

## Database Platform

- PostgreSQL is the primary persistent store.

## Canonical Migration Source

- Ordered SQL scripts in `ad-docs/database-script` are the executable migration source of truth.
- Runtime entities and repositories are expected to align with those scripts.

## Coverage Areas

Current migration chain covers:
- Core schema, indexes, and trigger setup
- Auth/session hardening
- Role and menu authorization model
- Hierarchical enum configuration (parent-child value links)
- Core business runtime state and metadata
- Contact hierarchy tagging aligned to location parent-child structure
- Public gateway persistence surfaces
- Member services persistence surfaces
- Integration settings (Google + SMTP/IMAP)
- Password reset token persistence
- Governance and analytics menu evolution

## Recent Migration Segment (043-064)

- `043_report_metric_target.sql`
- `044_sreni_analytics_menu.sql`
- `045_sthan_menus_reports_expenses_contacts.sql`
- `046_governance_menu_access_control.sql`
- `047_location_report_metrics_scope.sql`
- `048_fix_sthan_table_types.sql`
- `049_sthan_contacts.sql`
- `050_governance_ai_chatbot_menu.sql`
- `051_sreni_join_us_visibility.sql`
- `052_smtp_integration_config.sql`
- `053_smtp_imap_fields.sql`
- `054_admin_password_reset_tokens.sql`
- `055_analytics_studio_layouts.sql`
- `059_contact_sreni_tags.sql`
- `060_sreni_contact_active.sql`
- `061_sreni_contacts_nullable_sreni.sql`
- `062_location_parent_id.sql`
- `063_enum_values_parent_value.sql`
- `064_contact_location_hierarchy_tags.sql`

These scripts establish current governance menu hierarchy, location-scoped metrics, public join-us visibility controls, email integration settings, analytics studio persisted layouts, location parent-child modeling, hierarchical enum support, and contact hierarchy tagging across zone/sthan/division.

## Migration Discipline

- Prefer forward-only additive migrations.
- Keep execution order deterministic across environments.
- Use idempotent guards where practical for safer replay scenarios.
- Reflect schema changes in API contracts and documentation in the same delivery cycle.

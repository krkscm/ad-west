# Database Script

This folder contains executable PostgreSQL scripts for ADWest.

## Database Policy
- ADWest is PostgreSQL-only.
- Do not add MySQL, SQL Server, Oracle, or multi-DB variants.
- All future DB scripts in this folder must be PostgreSQL dialect.

## Run Order
1. 000_extensions.sql
2. 001_schema.sql
3. 002_indexes.sql
4. 003_triggers.sql
5. 010_seed_minimal.sql (optional)
6. 011_auth_store.sql (recommended for persistent API auth)
7. 012_auth_security_hardening.sql (required for password+captcha login hardening)
8. 013_auth_remove_otp_mfa_legacy.sql (recommended cleanup for password+captcha-only deployments)
9. 014_core_business_frm_008_017_035_persistence.sql (FRM-008/017/035 DB persistence support)
10. 015_document_job_approval_modules.sql (FR-DOC/FR-JOB/FR-APR DB persistence support)
11. 016_core_business_runtime_state_store.sql (Core Business runtime snapshot persistence for DB mode)
12. 017_approval_workflow_runtime_metadata.sql (FR-APR workflow mode/escalation/audit metadata persistence)
13. 018_role_definitions.sql (Settings Roles Definition CRUD persistence)
14. 019_unified_locations.sql
15. 020_locations_active_flag.sql
16. 021_sreni_enhancements.sql
17. 022_permissions_policy_engine.sql
18. 023_permissions_redesign.sql
19. 024_users.sql
20. 025_menu_management.sql
21. 026_drop_scope_grants.sql
22. 027_approval_mode_permission_set_hierarchy.sql (Settings approval definitions now use enum_values approval_mode and permission-set hierarchy mapping)
23. 028_admin_code_role_definition.sql (Administrator CRUD now uses admin code and role-definition linkage)
24. 029_user_login_credentials.sql (Application users now own login credentials and super-admin access)
25. 030_sreni_contacts.sql (Per-Sreni contact list persistence with flexible JSONB row storage)
26. 031_sreni_menu_backfill_normalization.sql (DB-level normalization/backfill for Sreni parent/calendar/contacts menus)
27. 032_sreni_calendar_events.sql (Per-Sreni calendar event persistence with zone/sthan scope support)
28. 033_sreni_attendance_metrics_and_captures.sql (Attendance metric definitions, per-event captures, and attendance menu backfill; API also self-heals missing Sreni attendance child menu rows on menu list)
29. 034_remove_deprecated_contacts_import_runtime.sql (Decommissions deprecated contacts-import reconciliation and merge persistence objects)
30. 035_remove_deprecated_program_session_registration_legacy_attendance.sql (Decommissions deprecated program/session/registration and legacy attendance persistence)
31. 036_remove_deprecated_helpdesk_profile_edit_request_runtime.sql (Decommissions deprecated helpdesk/tickets and profile/edit-request persistence)
32. 037_remove_deprecated_jobs_resumes_and_enum_values.sql (Decommissions deprecated jobs/resumes persistence and removes deprecated enum values)
33. 038_auth_login_performance_indexes.sql (Adds targeted login indexes for users code/phone/lower(email) lookups)
34. 039_public_gateway.sql (Prepares future DB persistence for public helpdesk tickets, public job postings, and public job applications)
35. 040_member_services.sql (Adds reimbursements, special events, and notifications persistence)
36. 041_google_integration_config.sql (Adds DB-backed Google OAuth/Gmail configuration and settings menu key)
37. 042_drop_audit_fks.sql (Drops selected member-services audit FK constraints for mixed persistence/runtime compatibility)
38. 043_report_metric_target.sql (Adds target column for report metric definitions)
39. 044_sreni_analytics_menu.sql (Backfills Analytics Studio child menu for all existing Srenis)
40. 045_sthan_menus_reports_expenses_contacts.sql (Adds Sthan reports/expenses/contact persistence and backfills Sthan menu hierarchy)
41. 046_governance_menu_access_control.sql (Normalizes Governance parent and children so menu grants can govern Insights/My Approvals/Responsibility Chart)
42. 047_location_report_metrics_scope.sql (Adds report metric scope discriminator so Sthan/location metrics live in the shared report-metric table)
43. 048_fix_sthan_table_types.sql (Repairs Sthan report/expense table definitions with UUID location keys and reconciles sreni_contacts location linkage)
44. 049_sthan_contacts.sql (Adds standalone Sthan contacts persistence table with row index + JSONB payload)
45. 050_governance_ai_chatbot_menu.sql (Adds AI Chatbot governance menu key for grant-driven access control)
46. 051_sreni_join_us_visibility.sql (Adds explicit Join Us visibility flag on Sreni definitions for public intake filtering)
47. 055_analytics_studio_layouts.sql (Adds DB-backed saved Analytics Studio layouts per user and per Sreni)

## Enum Visibility Note
- API now serves only supported active enum domains to the UI, even if legacy rows still exist in `adwest.enum_values`.
- Run `037_remove_deprecated_jobs_resumes_and_enum_values.sql` to physically remove deprecated enum rows from DB.

## Why This Standard Exists
- Deterministic setup for new environments.
- Performance-focused indexing from day one.
- Versioned, auditable, forward-only DB changes.

## Rules for Future Implementations
- Any schema, index, or data migration change must be added here as a new ordered script.
- Never modify previously executed migration scripts in shared environments.
- Prefer additive changes, backfill, then tighten constraints.
- Keep scripts idempotent where practical (`IF NOT EXISTS`, guarded blocks).
- Keep optimization decisions aligned to PostgreSQL features (GIN/BRIN indexes, JSONB, CITEXT, pg_trgm).

## Naming Convention for New Scripts
- 011_<short_description>.sql
- 012_<short_description>.sql

## Execution Commands
```powershell
psql "$env:DATABASE_URL" -f "ad-docs/database-script/000_extensions.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/001_schema.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/002_indexes.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/003_triggers.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/010_seed_minimal.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/011_auth_store.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/012_auth_security_hardening.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/013_auth_remove_otp_mfa_legacy.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/014_core_business_frm_008_017_035_persistence.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/015_document_job_approval_modules.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/016_core_business_runtime_state_store.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/017_approval_workflow_runtime_metadata.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/018_role_definitions.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/019_unified_locations.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/020_locations_active_flag.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/021_sreni_enhancements.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/022_permissions_policy_engine.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/023_permissions_redesign.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/024_users.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/025_menu_management.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/026_drop_scope_grants.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/027_approval_mode_permission_set_hierarchy.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/028_admin_code_role_definition.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/029_user_login_credentials.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/030_sreni_contacts.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/031_sreni_menu_backfill_normalization.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/032_sreni_calendar_events.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/033_sreni_attendance_metrics_and_captures.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/034_remove_deprecated_contacts_import_runtime.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/035_remove_deprecated_program_session_registration_legacy_attendance.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/036_remove_deprecated_helpdesk_profile_edit_request_runtime.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/037_remove_deprecated_jobs_resumes_and_enum_values.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/038_auth_login_performance_indexes.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/039_public_gateway.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/040_member_services.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/041_google_integration_config.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/042_drop_audit_fks.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/043_report_metric_target.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/044_sreni_analytics_menu.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/045_sthan_menus_reports_expenses_contacts.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/046_governance_menu_access_control.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/047_location_report_metrics_scope.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/048_fix_sthan_table_types.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/049_sthan_contacts.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/050_governance_ai_chatbot_menu.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/051_sreni_join_us_visibility.sql"
psql "$env:DATABASE_URL" -f "ad-docs/database-script/055_analytics_studio_layouts.sql"
```


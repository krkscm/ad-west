# 06 - Data and Migration Map

## Database platform

- **PostgreSQL only** — no multi-dialect scripts
- **Canonical source:** `ad-docs/database-script/*.sql` (ordered `000`–`078`)
- **Schema:** `adwest`
- **Execution:** `psql $DATABASE_URL -f <script>` (see `database-script/README.md`)

## Bootstrap vs migrations

Some DDL also runs at API startup via `core-business-db-bootstrap.service.ts` (idempotent `CREATE TABLE IF NOT EXISTS`, menu backfills, column adds). This supports fresh dev databases but **production changes must still be committed as numbered SQL scripts**.

## Migration chain summary

| Range | Themes |
|-------|--------|
| 000–013 | Extensions, core schema, auth store, security hardening |
| 015–037 | Documents, jobs, approvals, runtime store, role/menu model, contact deprecations |
| 038–054 | Login indexes, public gateway, member services, integrations, password reset |
| 055–064 | Divisions, analytics layouts, contact tags, location hierarchy, enum parent values |
| 065–066 | Household members, enrollments, participant strategy (optional pair) |
| 068–069 | Platform enum seeds; legacy ENUM→varchar upgrade |
| 070–073 | Sthan calendar, job application activities, user gender |
| 074–078 | Member upload, labels, gada, join-us review, Seva Samithi registry & contributions |

Full run order: [database-script/README.md](../database-script/README.md).

## Scripts 070–078 (current tail)

| Script | Purpose | Notes |
|--------|---------|-------|
| `070_sthan_calendar_events.sql` | `sthan_calendar_events` per location | |
| `071_job_application_activities.sql` | Application activity timeline table | |
| `072_job_application_activity_enum.sql` | Activity type enum seeds | |
| `073_user_gender.sql` | `users.gender` column | |
| `074_member_data_upload.sql` | Upload schema, enum seeds, Seva Samithi Excel flag | **Destructive:** deletes existing contact-related data; see warning below |
| `075_business_friendly_family_labels.sql` | Enum display label updates only | No schema change |
| `076_gada_assignment.sql` | Gada tables, `srenies.gada_assignment_enabled` | |
| `077_join_us_review.sql` | Review columns on contacts, menu seed | Run **before** `077_seva_samithi_contact_registry.sql` |
| `077_seva_samithi_contact_registry.sql` | `seva_samithi_contacts` registry + backfill | Duplicate prefix `077` — order matters |
| `078_seva_samithi_contributions.sql` | Seva activity + document tables | |

### ⚠️ Migration 074 warning

`074_member_data_upload.sql` includes `DELETE` statements that wipe existing contact, tag, member, and enrollment data before reseeding enums. **Do not run on production with live contact data** without a backup and explicit approval.

## Key tables by domain

### Auth and admin

| Table | Role |
|-------|------|
| `auth_admin_users` | Admin login accounts |
| `auth_member_users` | Member login accounts |
| `auth_sessions` | Active sessions |
| `admin_menu_grants` | Menu visibility per admin |
| `admin_password_reset_tokens` | Forgot-password tokens |
| `menu_items` | Sidebar structure |

### Org structure and access

| Table | Role |
|-------|------|
| `zones`, `locations` | Hierarchy (`level`, `parent_id`, `active`) |
| `srenies` | Sreni definitions (`join_us_visible`, `show_in_upload_excel`, `gada_assignment_enabled`) |
| `sreni_divisions` | Per-Sreni divisions |
| `permissions`, `permission_sets`, `permission_set_items` | Data access bundles |
| `role_definitions` | ZONE / STHAN / DIVISION levels |
| `users` | Org users (`role_id`, `sthan_id`, `permission_set_id`, `is_super_admin`, credentials) |

### Contacts and households

| Table | Role |
|-------|------|
| `sreni_contacts` | Household/child rows, JSONB `data`, location tags, review fields |
| `contact_sreni_tags` | Cross-Sreni membership (Excel Yes columns) |
| `household_members` | Head, spouse, children (065) |
| `household_enrollments` | Per-Sreni member enrollment (065) |
| `seva_samithi_contacts` | SS registry (one row per household primary) |
| `seva_samithi_contributions` | Dated seva activity per contact |
| `seva_samithi_contribution_documents` | File metadata per activity |
| `sreni_gadanayaks` | Registered gadanayaks per Sreni/sthan |
| `contact_gada_assignments` | Contact → gadanayak user |

### Sthan and reporting

| Table | Role |
|-------|------|
| `sthan_reports`, `sthan_expenses` | Sthan operational data |
| `sthan_calendar_events` | Sthan calendar (070) |
| `sthan_contacts` | Standalone sthan contact lists |
| `report_metric_definitions`, `sreni_monthly_reports` | Reporting |
| `analytics_studio_layouts` | Saved pivot/detail layouts |

### Public and member services

| Table | Role |
|-------|------|
| `public_helpdesk_tickets` | Helpdesk intake |
| `job_postings`, `job_applications` | Jobs |
| `job_application_activities` | Application timeline |
| `reimbursements`, `special_events`, `notifications` | Member services |

### Reference data

| Table | Role |
|-------|------|
| `enum_values` | Dropdown domains (`parent_value` for hierarchies) |

## Seva Samithi data model

```
sreni_contacts (household, sreni_id often NULL)
    ├── seva_samithi_contacts (registry — visibility on SS list)
    ├── contact_sreni_tags (membership in other Srenis when Excel Yes)
    ├── seva_samithi_contributions (activity log)
    │     └── seva_samithi_contribution_documents (files on disk)
    └── household_members (children from upload)
```

- SS list query joins `seva_samithi_contacts`, not `sreni_id = SS`.
- Other Sreni lists use `sreni_id` OR `contact_sreni_tags` — registry alone does **not** surface a contact elsewhere.

## Enum domains (074+)

Migration 074 seeds upload-related enums (blood group, status, grades, yes/no). Migration 068 seeds broader platform enums. API serves only active supported domains to the UI (`enum-types.constants.ts`).

## Migration discipline

1. Forward-only — never edit scripts already applied in shared environments
2. Prefer idempotent guards (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
3. Add new script number for every schema change
4. Update this chapter and `database-script/README.md` in the same PR
5. Resolve duplicate numeric prefixes explicitly in README (e.g. two `077` files)

## Local execution example

```powershell
# From repo root; set connection string first
$env:DATABASE_URL = "<postgresql-connection-string>"

# Run a single pending script
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f "ad-docs/database-script/078_seva_samithi_contributions.sql"
```

For Supabase production pending scripts, see `database-script/supabase/MIGRATE.md` when available.

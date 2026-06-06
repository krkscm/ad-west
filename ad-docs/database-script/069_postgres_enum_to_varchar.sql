-- 069_postgres_enum_to_varchar.sql
-- UPGRADE ONLY: for databases that ran 039/040 before they used plain text columns.
-- Fresh installs (updated 039/040) can SKIP this file entirely.
--
-- Supabase SQL editor: if a previous attempt failed, run "ROLLBACK;" alone first.

-- ── reimbursement_requests ───────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='reimbursement_requests' AND column_name='category') THEN
    ALTER TABLE adwest.reimbursement_requests ALTER COLUMN category DROP DEFAULT;
    ALTER TABLE adwest.reimbursement_requests ALTER COLUMN category TYPE text USING category::text;
    ALTER TABLE adwest.reimbursement_requests ALTER COLUMN category SET DEFAULT 'other';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='reimbursement_requests' AND column_name='status') THEN
    ALTER TABLE adwest.reimbursement_requests ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE adwest.reimbursement_requests ALTER COLUMN status TYPE text USING status::text;
    ALTER TABLE adwest.reimbursement_requests ALTER COLUMN status SET DEFAULT 'draft';
  END IF;
END $$;

-- ── event_form_fields ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='event_form_fields' AND column_name='field_type') THEN
    ALTER TABLE adwest.event_form_fields ALTER COLUMN field_type DROP DEFAULT;
    ALTER TABLE adwest.event_form_fields ALTER COLUMN field_type TYPE text USING field_type::text;
    ALTER TABLE adwest.event_form_fields ALTER COLUMN field_type SET DEFAULT 'text';
  END IF;
END $$;

-- ── notifications ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='notifications' AND column_name='target') THEN
    ALTER TABLE adwest.notifications ALTER COLUMN target DROP DEFAULT;
    ALTER TABLE adwest.notifications ALTER COLUMN target TYPE text USING target::text;
    ALTER TABLE adwest.notifications ALTER COLUMN target SET DEFAULT 'all';
  END IF;
END $$;

-- ── helpdesk_tickets ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='helpdesk_tickets' AND column_name='category') THEN
    ALTER TABLE adwest.helpdesk_tickets ALTER COLUMN category DROP DEFAULT;
    ALTER TABLE adwest.helpdesk_tickets ALTER COLUMN category TYPE text USING category::text;
    ALTER TABLE adwest.helpdesk_tickets ALTER COLUMN category SET DEFAULT 'general';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='helpdesk_tickets' AND column_name='status') THEN
    ALTER TABLE adwest.helpdesk_tickets ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE adwest.helpdesk_tickets ALTER COLUMN status TYPE text USING status::text;
    ALTER TABLE adwest.helpdesk_tickets ALTER COLUMN status SET DEFAULT 'open';
  END IF;
END $$;

-- ── job_postings ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='job_postings' AND column_name='type') THEN
    ALTER TABLE adwest.job_postings ALTER COLUMN type DROP DEFAULT;
    ALTER TABLE adwest.job_postings ALTER COLUMN type TYPE text USING type::text;
    ALTER TABLE adwest.job_postings ALTER COLUMN type SET DEFAULT 'full_time';
  END IF;
END $$;

-- ── job_applications ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='adwest' AND table_name='job_applications' AND column_name='status') THEN
    ALTER TABLE adwest.job_applications ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE adwest.job_applications ALTER COLUMN status TYPE text USING status::text;
    ALTER TABLE adwest.job_applications ALTER COLUMN status SET DEFAULT 'new';
  END IF;
END $$;

-- ── Drop legacy PG enum types (no-op if already text / types never created) ──
DROP TYPE IF EXISTS adwest.reimbursement_category;
DROP TYPE IF EXISTS adwest.reimbursement_status;
DROP TYPE IF EXISTS adwest.form_field_type;
DROP TYPE IF EXISTS adwest.notification_target;
DROP TYPE IF EXISTS adwest.helpdesk_ticket_category;
DROP TYPE IF EXISTS adwest.helpdesk_ticket_status;
DROP TYPE IF EXISTS adwest.job_posting_type;
DROP TYPE IF EXISTS adwest.job_application_status;

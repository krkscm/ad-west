-- Migration 048: Fix sthan_reports and sthan_expenses location_id column type.
-- Earlier version of migration 045 used TEXT for location_id, which is incompatible
-- with adwest.locations(id) UUID type — FK creation failed, leaving tables absent or broken.
-- This migration drops and recreates them correctly with UUID types.

-- ── Drop broken tables if they exist ─────────────────────────────────────────
DROP TABLE IF EXISTS adwest.sthan_expenses;
DROP TABLE IF EXISTS adwest.sthan_reports;
DROP TABLE IF EXISTS adwest.sthan_report_metrics;  -- created by 045 before 047 dropped it

-- ── Recreate with correct UUID location_id ────────────────────────────────────

CREATE TABLE adwest.sthan_reports (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  UUID          NOT NULL REFERENCES adwest.locations(id) ON DELETE CASCADE,
  period_year  INTEGER       NOT NULL,
  period_month INTEGER       NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  entries      JSONB         NOT NULL DEFAULT '{}',
  notes        TEXT,
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (location_id, period_year, period_month)
);

CREATE INDEX idx_sthan_reports_location ON adwest.sthan_reports(location_id);

CREATE TABLE adwest.sthan_expenses (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id           UUID          NOT NULL REFERENCES adwest.locations(id) ON DELETE CASCADE,
  submitted_by          TEXT,
  category              TEXT          NOT NULL DEFAULT 'other'
                          CHECK (category IN ('travel','food','accommodation','event_supplies','printing','other')),
  description           TEXT          NOT NULL,
  amount                NUMERIC(12,2) NOT NULL,
  currency              TEXT          NOT NULL DEFAULT 'AED',
  receipt_url           TEXT,
  receipt_original_name TEXT,
  status                TEXT          NOT NULL DEFAULT 'submitted'
                          CHECK (status IN ('draft','submitted','pending_review','approved','rejected')),
  reviewer_notes        TEXT,
  reviewed_by           TEXT,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_sthan_expenses_location ON adwest.sthan_expenses(location_id);
CREATE INDEX idx_sthan_expenses_status   ON adwest.sthan_expenses(status);

-- ── Fix sreni_contacts.location_id if it was added as TEXT ───────────────────
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM   information_schema.columns
  WHERE  table_schema = 'adwest'
    AND  table_name   = 'sreni_contacts'
    AND  column_name  = 'location_id';

  IF col_type = 'text' THEN
    -- Drop FK constraint first, then change type
    ALTER TABLE adwest.sreni_contacts DROP CONSTRAINT IF EXISTS sreni_contacts_location_id_fkey;
    ALTER TABLE adwest.sreni_contacts ALTER COLUMN location_id TYPE UUID USING location_id::uuid;
    ALTER TABLE adwest.sreni_contacts ADD CONSTRAINT sreni_contacts_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES adwest.locations(id) ON DELETE CASCADE;
  ELSIF col_type IS NULL THEN
    -- Column doesn't exist yet — add it with correct type
    ALTER TABLE adwest.sreni_contacts
      ADD COLUMN location_id UUID REFERENCES adwest.locations(id) ON DELETE CASCADE;
  END IF;
  -- If already UUID, nothing to do
END;
$$;

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_location ON adwest.sreni_contacts(location_id);

-- ── Make sreni_id nullable (idempotent) ───────────────────────────────────────
ALTER TABLE adwest.sreni_contacts ALTER COLUMN sreni_id DROP NOT NULL;

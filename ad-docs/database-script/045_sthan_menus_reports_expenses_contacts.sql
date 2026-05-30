-- Migration 045: Sthans menu, reports, expenses, and contacts
-- All location_id columns use UUID to match adwest.locations(id) type.

-- ── Sthan Reports ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adwest.sthan_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  UUID        NOT NULL REFERENCES adwest.locations(id) ON DELETE CASCADE,
  period_year  INTEGER     NOT NULL,
  period_month INTEGER     NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  entries      JSONB       NOT NULL DEFAULT '{}',
  notes        TEXT,
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_sthan_reports_location ON adwest.sthan_reports(location_id);

-- ── Sthan Expenses ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS adwest.sthan_expenses (
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

CREATE INDEX IF NOT EXISTS idx_sthan_expenses_location ON adwest.sthan_expenses(location_id);
CREATE INDEX IF NOT EXISTS idx_sthan_expenses_status   ON adwest.sthan_expenses(status);

-- ── Sthan Contacts (extend sreni_contacts) ────────────────────────────────────
-- Make sreni_id nullable so rows can belong to a sthan location instead.
ALTER TABLE adwest.sreni_contacts
  ALTER COLUMN sreni_id DROP NOT NULL;

ALTER TABLE adwest.sreni_contacts
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES adwest.locations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_location ON adwest.sreni_contacts(location_id);

-- ── Sthan Menus (backfill for existing STHAN locations) ───────────────────────
DO $$
DECLARE
  loc    RECORD;
  menu_now TEXT := now()::text;
BEGIN
  -- Single "Sthans" root parent
  INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'sthans', 'Sthans', null, '📍', 1500, true, menu_now, menu_now)
  ON CONFLICT (key) DO UPDATE SET label = 'Sthans', parent_key = NULL, icon = '📍', sort_order = 1500, active = true;

  -- Remove stale sub-item entries created by older code (tabs should be in UI, not sidebar)
  DELETE FROM adwest.menu_items
  WHERE key LIKE 'sthan-%-reports'
     OR key LIKE 'sthan-%-expenses'
     OR key LIKE 'sthan-%-contacts';

  -- Re-parent any existing sthan-{id} root entries under 'sthans'
  UPDATE adwest.menu_items
  SET    parent_key = 'sthans', updated_at = menu_now
  WHERE  key LIKE 'sthan-%'
    AND  (parent_key IS NULL OR parent_key <> 'sthans');

  -- Create sthan-{id} child entries for each active STHAN location
  FOR loc IN
    SELECT id::text AS id, name FROM adwest.locations WHERE level = 'sthan' AND active = true
  LOOP
    INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
    VALUES (gen_random_uuid()::text, 'sthan-' || loc.id, loc.name, 'sthans', null, 0, true, menu_now, menu_now)
    ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, parent_key = 'sthans', active = true;
  END LOOP;
END;
$$;

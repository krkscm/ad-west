-- 030_sreni_contacts.sql
-- Flexible per-Sreni contact list table.
-- Each row stores one uploaded contact record.
-- The `data` jsonb column holds all fields from the source Excel sheet,
-- so different Srenies can have different column layouts without schema changes.
-- When Sreni-specific Excel templates are finalised, typed columns can be added
-- alongside this generic store without breaking existing data.

CREATE TABLE IF NOT EXISTS adwest.sreni_contacts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sreni_id      text        NOT NULL,          -- FK (logical) → adwest.srenies.id
  row_index     int         NOT NULL,          -- 1-based row number from the source file
  data          jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- all columns as key/value
  source_file   text,                          -- original filename for traceability
  uploaded_by   text,                          -- admin user id or email
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_sreni_id
  ON adwest.sreni_contacts (sreni_id);

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_created_at
  ON adwest.sreni_contacts (created_at DESC);

-- Auto-update updated_at on row change (reuses the existing set_updated_at function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sreni_contacts_updated_at'
      AND tgrelid = 'adwest.sreni_contacts'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_sreni_contacts_updated_at
      BEFORE UPDATE ON adwest.sreni_contacts
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

-- Add contacts child menu entry for every existing Sreni
-- (new Srenies get this automatically via createSreniDefinition service logic)
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  'sreni-' || s.id || '-contacts',
  'Contacts',
  'sreni-' || s.id,
  '📋',
  20,
  true,
  NOW()::text,
  NOW()::text
FROM adwest.srenies s
ON CONFLICT (key) DO NOTHING;

-- 055_sreni_divisions.sql
-- Per-Sreni user-defined Divisions for grouping contacts.
-- Users define divisions (e.g. "Zone A", "Zone B") per Sreni,
-- then assign each contact to one division.

CREATE TABLE IF NOT EXISTS adwest.sreni_divisions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sreni_id       text        NOT NULL,
  name           text        NOT NULL,
  display_order  int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sreni_divisions_sreni_id
  ON adwest.sreni_divisions (sreni_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sreni_divisions_updated_at'
      AND tgrelid = 'adwest.sreni_divisions'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_sreni_divisions_updated_at
      BEFORE UPDATE ON adwest.sreni_divisions
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

-- Add division_id FK column to sreni_contacts (uuid to match sreni_divisions.id)
ALTER TABLE adwest.sreni_contacts
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES adwest.sreni_divisions(id) ON DELETE SET NULL;

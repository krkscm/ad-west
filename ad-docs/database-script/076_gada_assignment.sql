-- Gada (Gadanayak) assignment per Sreni — excluded for Seva Samithi.

ALTER TABLE adwest.srenies
  ADD COLUMN IF NOT EXISTS gada_assignment_enabled boolean NOT NULL DEFAULT true;

UPDATE adwest.srenies
SET gada_assignment_enabled = false
WHERE name ILIKE '%seva samithi%'
   OR LOWER(COALESCE(code, '')) IN ('seva_samithi', 'sevasamithi')
   OR COALESCE(is_service_sreny, false) = true;

CREATE TABLE IF NOT EXISTS adwest.sreni_gadanayaks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreni_id   text NOT NULL,
  sthan_id   text NOT NULL,
  user_id    uuid NOT NULL REFERENCES adwest.users(id) ON DELETE CASCADE,
  active     boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES adwest.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sreni_gadanayaks UNIQUE (sreni_id, sthan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sreni_gadanayaks_sreni_sthan
  ON adwest.sreni_gadanayaks (sreni_id, sthan_id);

CREATE INDEX IF NOT EXISTS idx_sreni_gadanayaks_user
  ON adwest.sreni_gadanayaks (user_id);

CREATE TABLE IF NOT EXISTS adwest.contact_gada_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid NOT NULL REFERENCES adwest.sreni_contacts(id) ON DELETE CASCADE,
  sreni_id          text NOT NULL,
  gadanayak_user_id uuid NOT NULL REFERENCES adwest.users(id) ON DELETE RESTRICT,
  assigned_by       uuid REFERENCES adwest.users(id) ON DELETE SET NULL,
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_contact_gada_per_sreni UNIQUE (contact_id, sreni_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_gada_sreni_user
  ON adwest.contact_gada_assignments (sreni_id, gadanayak_user_id);

CREATE INDEX IF NOT EXISTS idx_contact_gada_contact
  ON adwest.contact_gada_assignments (contact_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sreni_gadanayaks_updated_at'
      AND tgrelid = 'adwest.sreni_gadanayaks'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_sreni_gadanayaks_updated_at
      BEFORE UPDATE ON adwest.sreni_gadanayaks
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_contact_gada_assignments_updated_at'
      AND tgrelid = 'adwest.contact_gada_assignments'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_contact_gada_assignments_updated_at
      BEFORE UPDATE ON adwest.contact_gada_assignments
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

-- 065_household_members_and_enrollments.sql
-- Household members (head/spouse/children) and per-Sreni enrollments with division.
-- Excel import continues to populate household head/spouse only; children are added in-app.

ALTER TABLE adwest.srenies
  ADD COLUMN IF NOT EXISTS enrollment_scope text NOT NULL DEFAULT 'HOUSEHOLD';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_srenies_enrollment_scope'
      AND conrelid = 'adwest.srenies'::regclass
  ) THEN
    ALTER TABLE adwest.srenies
      ADD CONSTRAINT chk_srenies_enrollment_scope
      CHECK (enrollment_scope IN ('HOUSEHOLD', 'MEMBER'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS adwest.household_members (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     uuid        NOT NULL REFERENCES adwest.sreni_contacts(id) ON DELETE CASCADE,
  role           text        NOT NULL,
  source         text        NOT NULL DEFAULT 'import',
  name           text        NOT NULL,
  phone          text,
  email          text,
  gender         text,
  date_of_birth  date,
  sort_order     int         NOT NULL DEFAULT 0,
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_household_members_role CHECK (role IN ('head', 'spouse', 'child', 'other')),
  CONSTRAINT chk_household_members_source CHECK (source IN ('import', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_household_members_contact_id
  ON adwest.household_members (contact_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_members_one_active_head
  ON adwest.household_members (contact_id)
  WHERE role = 'head' AND active = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_household_members_updated_at'
      AND tgrelid = 'adwest.household_members'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_household_members_updated_at
      BEFORE UPDATE ON adwest.household_members
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS adwest.household_member_sreni_enrollments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid        NOT NULL REFERENCES adwest.household_members(id) ON DELETE CASCADE,
  sreni_id     text        NOT NULL,
  division_id  uuid        REFERENCES adwest.sreni_divisions(id) ON DELETE SET NULL,
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_household_member_sreni UNIQUE (member_id, sreni_id)
);

CREATE INDEX IF NOT EXISTS idx_hmse_sreni_id
  ON adwest.household_member_sreni_enrollments (sreni_id);

CREATE INDEX IF NOT EXISTS idx_hmse_member_id
  ON adwest.household_member_sreni_enrollments (member_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_household_member_sreni_enrollments_updated_at'
      AND tgrelid = 'adwest.household_member_sreni_enrollments'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_household_member_sreni_enrollments_updated_at
      BEFORE UPDATE ON adwest.household_member_sreni_enrollments
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

-- Backfill head from existing contact rows
INSERT INTO adwest.household_members (contact_id, role, source, name, phone, sort_order)
SELECT
  c.id,
  'head',
  'import',
  COALESCE(NULLIF(TRIM(c.data->>'name'), ''), 'Unknown'),
  NULLIF(TRIM(c.data->>'personalNumber'), ''),
  0
FROM adwest.sreni_contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.household_members hm
  WHERE hm.contact_id = c.id AND hm.role = 'head'
);

-- Backfill spouse when wife name is present
INSERT INTO adwest.household_members (contact_id, role, source, name, phone, sort_order)
SELECT
  c.id,
  'spouse',
  'import',
  TRIM(c.data->>'wifeName'),
  NULLIF(TRIM(c.data->>'mobileNo4'), ''),
  1
FROM adwest.sreni_contacts c
WHERE NULLIF(TRIM(c.data->>'wifeName'), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM adwest.household_members hm
    WHERE hm.contact_id = c.id AND hm.role = 'spouse' AND hm.source = 'import'
  );

-- Bala Bharathi uses per-child enrollments
UPDATE adwest.srenies
SET enrollment_scope = 'MEMBER'
WHERE enrollment_scope = 'HOUSEHOLD'
  AND (
    LOWER(COALESCE(code, '')) IN ('bb', 'balabarathi', 'bala_bharathi')
    OR name ILIKE '%bala%bharathi%'
    OR name ILIKE '%balabarathi%'
  );

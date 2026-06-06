-- 066_household_participant_strategy.sql
-- Per-Sreni participant resolution strategy for notifications, events, and analytics.
-- Seva Samithi is intentionally excluded — it keeps HOUSEHOLD_HEAD (one row = one contact).

ALTER TABLE adwest.srenies
  ADD COLUMN IF NOT EXISTS primary_contact_strategy text NOT NULL DEFAULT 'HOUSEHOLD_HEAD';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_srenies_primary_contact_strategy'
      AND conrelid = 'adwest.srenies'::regclass
  ) THEN
    ALTER TABLE adwest.srenies
      ADD CONSTRAINT chk_srenies_primary_contact_strategy
      CHECK (primary_contact_strategy IN ('HOUSEHOLD_HEAD', 'FEMALE_PARTICIPANTS', 'ENROLLED_CHILDREN'));
  END IF;
END;
$$;

-- Bala Bharathi: participants = enrolled children
UPDATE adwest.srenies
SET primary_contact_strategy = 'ENROLLED_CHILDREN'
WHERE primary_contact_strategy = 'HOUSEHOLD_HEAD'
  AND (
    enrollment_scope = 'MEMBER'
    OR LOWER(COALESCE(code, '')) IN ('bb', 'balabarathi', 'bala_bharathi')
    OR name ILIKE '%bala%bharathi%'
    OR name ILIKE '%balabarathi%'
  );

-- Ladies Srenis (Mahila Yoga, etc.) — NOT Seva Samithi
UPDATE adwest.srenies
SET primary_contact_strategy = 'FEMALE_PARTICIPANTS'
WHERE primary_contact_strategy = 'HOUSEHOLD_HEAD'
  AND NOT (
    name ILIKE '%seva samithi%'
    OR LOWER(COALESCE(code, '')) IN ('seva_samithi', 'sevasamithi')
  )
  AND (
    name ILIKE '%mahila%'
    OR name ILIKE '%ladies%'
    OR name ILIKE '%women%'
    OR LOWER(COALESCE(code, '')) IN ('mahila', 'mahila_yoga', 'my', 'ladies')
  );

-- Import-synced spouse rows from wifeName are treated as female participants
UPDATE adwest.household_members
SET gender = 'female'
WHERE role = 'spouse'
  AND source = 'import'
  AND (gender IS NULL OR TRIM(gender) = '');

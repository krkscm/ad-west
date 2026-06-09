-- 074_member_data_upload.sql
-- Member Data Upload template: schema extensions, enum seeds, data wipe, show_in_upload_excel seed.

-- ── Sreni: show in upload Excel ─────────────────────────────────────────────
ALTER TABLE adwest.srenies
  ADD COLUMN IF NOT EXISTS show_in_upload_excel boolean NOT NULL DEFAULT false;

-- ── Contact rows: household vs Balabharathi child ───────────────────────────
ALTER TABLE adwest.sreni_contacts
  ADD COLUMN IF NOT EXISTS parent_contact_id uuid REFERENCES adwest.sreni_contacts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS contact_kind text NOT NULL DEFAULT 'household',
  ADD COLUMN IF NOT EXISTS sr_no int;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_sreni_contacts_contact_kind'
      AND conrelid = 'adwest.sreni_contacts'::regclass
  ) THEN
    ALTER TABLE adwest.sreni_contacts
      ADD CONSTRAINT chk_sreni_contacts_contact_kind
      CHECK (contact_kind IN ('household', 'child'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_parent_contact_id
  ON adwest.sreni_contacts (parent_contact_id)
  WHERE parent_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_contact_kind
  ON adwest.sreni_contacts (contact_kind);

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_sr_no
  ON adwest.sreni_contacts (sr_no)
  WHERE sr_no IS NOT NULL;

-- ── Wipe legacy contact data (clean slate for new template) ─────────────────
DELETE FROM adwest.contact_sreni_tags;
DELETE FROM adwest.household_member_sreni_enrollments;
DELETE FROM adwest.household_members;
DELETE FROM adwest.sreni_contacts;

-- ── Enum seeds for member upload template ───────────────────────────────────
INSERT INTO adwest.enum_values (id, enum_type, value, label, sort_order, active, parent_value, created_at, updated_at)
VALUES
  ('ev-contact-blood-a-pos', 'contact_blood_group', 'A+', 'A+', 10, true, null, now(), now()),
  ('ev-contact-blood-a-neg', 'contact_blood_group', 'A-', 'A-', 20, true, null, now(), now()),
  ('ev-contact-blood-b-pos', 'contact_blood_group', 'B+', 'B+', 30, true, null, now(), now()),
  ('ev-contact-blood-b-neg', 'contact_blood_group', 'B-', 'B-', 40, true, null, now(), now()),
  ('ev-contact-blood-ab-pos', 'contact_blood_group', 'AB+', 'AB+', 50, true, null, now(), now()),
  ('ev-contact-blood-ab-neg', 'contact_blood_group', 'AB-', 'AB-', 60, true, null, now(), now()),
  ('ev-contact-blood-o-pos', 'contact_blood_group', 'O+', 'O+', 70, true, null, now(), now()),
  ('ev-contact-blood-o-neg', 'contact_blood_group', 'O-', 'O-', 80, true, null, now(), now()),
  ('ev-contact-status-active', 'contact_current_status', 'Active', 'Active', 10, true, null, now(), now()),
  ('ev-contact-status-inactive', 'contact_current_status', 'Inactive', 'Inactive', 20, true, null, now(), now()),
  ('ev-contact-status-left', 'contact_current_status', 'Left', 'Left', 30, true, null, now(), now()),
  ('ev-contact-status-transferred', 'contact_current_status', 'Transferred', 'Transferred', 40, true, null, now(), now()),
  ('ev-contact-grade-lkg', 'contact_child_grade', 'LKG', 'LKG', 10, true, null, now(), now()),
  ('ev-contact-grade-ukg', 'contact_child_grade', 'UKG', 'UKG', 20, true, null, now(), now()),
  ('ev-contact-grade-1', 'contact_child_grade', 'Grade 1', 'Grade 1', 30, true, null, now(), now()),
  ('ev-contact-grade-2', 'contact_child_grade', 'Grade 2', 'Grade 2', 40, true, null, now(), now()),
  ('ev-contact-grade-3', 'contact_child_grade', 'Grade 3', 'Grade 3', 50, true, null, now(), now()),
  ('ev-contact-grade-4', 'contact_child_grade', 'Grade 4', 'Grade 4', 60, true, null, now(), now()),
  ('ev-contact-grade-5', 'contact_child_grade', 'Grade 5', 'Grade 5', 70, true, null, now(), now()),
  ('ev-contact-grade-6', 'contact_child_grade', 'Grade 6', 'Grade 6', 80, true, null, now(), now()),
  ('ev-contact-grade-7', 'contact_child_grade', 'Grade 7', 'Grade 7', 90, true, null, now(), now()),
  ('ev-contact-grade-8', 'contact_child_grade', 'Grade 8', 'Grade 8', 100, true, null, now(), now()),
  ('ev-contact-grade-9', 'contact_child_grade', 'Grade 9', 'Grade 9', 110, true, null, now(), now()),
  ('ev-contact-grade-10', 'contact_child_grade', 'Grade 10', 'Grade 10', 120, true, null, now(), now()),
  ('ev-contact-grade-11', 'contact_child_grade', 'Grade 11', 'Grade 11', 130, true, null, now(), now()),
  ('ev-contact-grade-12', 'contact_child_grade', 'Grade 12', 'Grade 12', 140, true, null, now(), now()),
  ('ev-contact-yes-no-yes', 'contact_yes_no', 'Yes', 'Yes', 10, true, null, now(), now()),
  ('ev-contact-yes-no-no', 'contact_yes_no', 'No', 'No', 20, true, null, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Auto-enable show_in_upload_excel (exclude Seva Samithi) ─────────────────
UPDATE adwest.srenies
SET show_in_upload_excel = true
WHERE active = true
  AND NOT (
    name ILIKE '%seva samithi%'
    OR LOWER(COALESCE(code, '')) IN ('seva_samithi', 'sevasamithi')
  )
  AND (
    name ILIKE '%yoga%'
    OR name ILIKE '%mahila%'
    OR name ILIKE '%yuva%'
    OR name ILIKE '%samithi%'
    OR name ILIKE '%mathru%'
    OR name ILIKE '%balabarathi%'
    OR name ILIKE '%bala%bharathi%'
    OR LOWER(COALESCE(code, '')) IN ('yoga', 'mahila_yoga', 'my', 'yuva', 'samithi', 'mathru_samithi', 'bb', 'balabarathi', 'bala_bharathi')
  );

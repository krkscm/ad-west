-- Join Us submission review workflow (internal inbox).

ALTER TABLE adwest.sreni_contacts
  ADD COLUMN IF NOT EXISTS review_status text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES adwest.users(id) ON DELETE SET NULL;

UPDATE adwest.sreni_contacts
SET review_status = 'pending'
WHERE source_file = 'public-join-us-form'
  AND contact_kind = 'household'
  AND review_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_join_us_review
  ON adwest.sreni_contacts (review_status, created_at DESC)
  WHERE source_file = 'public-join-us-form' AND contact_kind = 'household';

INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES (
  'menu_governance_join_us_review',
  'governance-join-us-review',
  'Join Us Review',
  'governance',
  '📝',
  25,
  TRUE,
  NOW()::text,
  NOW()::text
)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  sort_order = EXCLUDED.sort_order,
  active = TRUE,
  updated_at = NOW()::text;

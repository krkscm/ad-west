-- Migration 046: Governance menu normalization for grant-driven sidebar access
-- Ensures Governance parent and children exist and are correctly parented.

BEGIN;

-- Ensure Governance parent exists.
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'governance',
  'Governance',
  NULL,
  '🧭',
  15,
  true,
  NOW()::text,
  NOW()::text
)
ON CONFLICT (key) DO NOTHING;

-- Ensure Governance children exist.
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'insights', 'Insights', 'governance', NULL, 10, true, NOW()::text, NOW()::text),
  (gen_random_uuid()::text, 'my-approvals', 'My Approvals', 'governance', NULL, 20, true, NOW()::text, NOW()::text),
  (gen_random_uuid()::text, 'settings-responsibility-chart', 'Responsibility Chart', 'governance', NULL, 30, true, NOW()::text, NOW()::text)
ON CONFLICT (key) DO NOTHING;

-- Normalize existing rows (if they were created before this migration).
UPDATE adwest.menu_items
SET
  parent_key = NULL,
  icon = COALESCE(icon, '🧭'),
  sort_order = 15,
  updated_at = NOW()::text
WHERE key = 'governance';

UPDATE adwest.menu_items
SET
  parent_key = 'governance',
  sort_order = CASE key
    WHEN 'insights' THEN 10
    WHEN 'my-approvals' THEN 20
    WHEN 'settings-responsibility-chart' THEN 30
    ELSE sort_order
  END,
  updated_at = NOW()::text
WHERE key IN ('insights', 'my-approvals', 'settings-responsibility-chart');

COMMIT;

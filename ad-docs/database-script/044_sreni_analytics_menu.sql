-- Migration 044: Add Sreni Analytics Studio child menu for all existing Srenis
BEGIN;

INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  concat('sreni-', s.id, '-analytics'),
  'Analytics Studio',
  concat('sreni-', s.id),
  '📈',
  60,
  true,
  NOW()::text,
  NOW()::text
FROM adwest.srenies s
WHERE NOT EXISTS (
  SELECT 1
  FROM adwest.menu_items m
  WHERE m.key = concat('sreni-', s.id, '-analytics')
);

COMMIT;

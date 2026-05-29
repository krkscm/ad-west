-- 031_sreni_menu_backfill_normalization.sql
-- Normalize/backfill Sreni menu hierarchy at DB level.
-- Ensures each Sreni has canonical parent, calendar, and contacts menu entries.

-- Parent menu for each Sreni
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  'sreni-' || s.id,
  s.name,
  NULL,
  '🏘️',
  1000,
  true,
  NOW()::text,
  NOW()::text
FROM adwest.srenies s
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  active = true,
  updated_at = EXCLUDED.updated_at;

-- Calendar child menu for each Sreni
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  'sreni-' || s.id || '-calendar',
  'Calendar',
  'sreni-' || s.id,
  '📅',
  10,
  true,
  NOW()::text,
  NOW()::text
FROM adwest.srenies s
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  active = true,
  updated_at = EXCLUDED.updated_at;

-- Contacts child menu for each Sreni
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
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  active = true,
  updated_at = EXCLUDED.updated_at;

-- Migration 058: Merge Governance + Member Services into General Services
-- Normalizes menu hierarchy so member-services child menus are directly under governance.

BEGIN;

-- Ensure the shared parent exists and is normalized.
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES (
  gen_random_uuid()::text,
  'governance',
  'General Services',
  NULL,
  '🧭',
  15,
  true,
  NOW()::text,
  NOW()::text
)
ON CONFLICT (key) DO NOTHING;

UPDATE adwest.menu_items
SET
  label = 'General Services',
  parent_key = NULL,
  icon = COALESCE(icon, '🧭'),
  sort_order = 15,
  active = true,
  updated_at = NOW()::text
WHERE key = 'governance';

-- Re-parent member-services child menus under governance.
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'member-services-reimbursements', 'Reimbursements', 'governance', NULL, 40, true, NOW()::text, NOW()::text),
  (gen_random_uuid()::text, 'member-services-events', 'Special Events', 'governance', NULL, 50, true, NOW()::text, NOW()::text),
  (gen_random_uuid()::text, 'member-services-notifications', 'Notifications', 'governance', NULL, 60, true, NOW()::text, NOW()::text),
  (gen_random_uuid()::text, 'member-services-gmail', 'Gmail Workspace', 'governance', NULL, 70, true, NOW()::text, NOW()::text)
ON CONFLICT (key) DO NOTHING;

UPDATE adwest.menu_items
SET
  parent_key = 'governance',
  sort_order = CASE key
    WHEN 'member-services-reimbursements' THEN 40
    WHEN 'member-services-events' THEN 50
    WHEN 'member-services-notifications' THEN 60
    WHEN 'member-services-gmail' THEN 70
    ELSE sort_order
  END,
  active = true,
  updated_at = NOW()::text
WHERE key IN (
  'member-services-reimbursements',
  'member-services-events',
  'member-services-notifications',
  'member-services-gmail'
);

-- Remove legacy parent key and stale grants to keep administrator menu access clean.
DELETE FROM adwest.admin_menu_grants WHERE menu_key = 'member-services';
DELETE FROM adwest.menu_items WHERE key = 'member-services';

COMMIT;

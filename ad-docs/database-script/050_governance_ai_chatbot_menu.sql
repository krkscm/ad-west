-- Migration 050: Governance AI Chatbot menu
-- Adds AI Chatbot under Governance so access can be managed via admin menu grants.

BEGIN;

INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'ai-chatbot', 'AI Chatbot', 'governance', NULL, 25, true, NOW()::text, NOW()::text)
ON CONFLICT (key) DO NOTHING;

UPDATE adwest.menu_items
SET
  parent_key = 'governance',
  sort_order = 25,
  active = true,
  updated_at = NOW()::text
WHERE key = 'ai-chatbot';

COMMIT;

-- Migration 059: Remove AI Chatbot menu from governance navigation

BEGIN;

DELETE FROM adwest.admin_menu_grants
WHERE menu_key = 'ai-chatbot';

UPDATE adwest.menu_items
SET
  active = false,
  updated_at = NOW()::text
WHERE key = 'ai-chatbot';

COMMIT;

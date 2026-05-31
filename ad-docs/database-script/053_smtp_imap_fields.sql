-- Migration 053: Add IMAP fields to SMTP integration config
BEGIN;

ALTER TABLE adwest.integration_smtp_config
  ADD COLUMN IF NOT EXISTS imap_host TEXT,
  ADD COLUMN IF NOT EXISTS imap_port INTEGER NOT NULL DEFAULT 993;

UPDATE adwest.integration_smtp_config
SET imap_host = 'imap.gmail.com', imap_port = 993
WHERE id = 'default' AND imap_host IS NULL;

COMMIT;

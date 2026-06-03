-- Migration 060: Add active flag to sreni_contacts
-- Allows individual contacts to be deactivated (soft-delete) or hard-deleted.

ALTER TABLE adwest.sreni_contacts
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_active ON adwest.sreni_contacts(active);

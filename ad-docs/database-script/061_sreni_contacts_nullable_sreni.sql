-- Migration 061: Allow sreni_id to be NULL on sreni_contacts
-- Contacts uploaded from the global Contacts page have no forced Sreni association.
-- They can be linked to Srenies later via contact_sreni_tags.

ALTER TABLE adwest.sreni_contacts
  ALTER COLUMN sreni_id DROP NOT NULL;

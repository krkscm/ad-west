-- 056_sreni_contact_sthan.sql
-- Adds a nullable sthan_id column to sreni_contacts so each contact
-- can be assigned to a Sthan (sub-unit of a Sreni).

ALTER TABLE adwest.sreni_contacts
  ADD COLUMN IF NOT EXISTS sthan_id text;

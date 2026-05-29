-- 034_remove_deprecated_contacts_import_runtime.sql
-- Decommission deprecated contact import / dedup / merge runtime persistence.
-- NOTE: Base contacts and memberships tables remain for now because other modules
-- still reference contact identity in this phase.

DROP FUNCTION IF EXISTS adwest.merge_contacts(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
);

DROP TABLE IF EXISTS adwest.contact_merge_events;
DROP TABLE IF EXISTS adwest.dedup_candidates;
DROP TABLE IF EXISTS adwest.import_batches;

-- FRM-008 metadata upsert flow is deprecated with contacts lifecycle endpoints.
DROP TRIGGER IF EXISTS trg_contact_sreny_metadata_membership_guard ON adwest.contact_sreny_metadata;
DROP TRIGGER IF EXISTS trg_contact_sreny_metadata_updated_at ON adwest.contact_sreny_metadata;
DROP TABLE IF EXISTS adwest.contact_sreny_metadata;

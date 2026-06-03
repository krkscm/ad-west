-- Migration 059: Contact Sreni Tags
-- Allows a contact (sreni_contacts row) to be tagged to additional srenies,
-- with an optional division assignment per sreni context.
-- The primary sreni is still stored in sreni_contacts.sreni_id.

CREATE TABLE IF NOT EXISTS adwest.contact_sreni_tags (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   UUID        NOT NULL,
  sreni_id     TEXT        NOT NULL,
  division_id  UUID        REFERENCES adwest.sreni_divisions(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, sreni_id)
);

CREATE INDEX IF NOT EXISTS idx_cst_contact_id ON adwest.contact_sreni_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_cst_sreni_id   ON adwest.contact_sreni_tags(sreni_id);

-- Migration 049: sthan_contacts — standalone contact list table per sthan location.
-- Stores Excel-uploaded contact rows for each sthan.
-- (sreni_contacts is a separate table for sreni contact lists if it exists.)

CREATE TABLE IF NOT EXISTS adwest.sthan_contacts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  UUID        NOT NULL REFERENCES adwest.locations(id) ON DELETE CASCADE,
  row_index    INTEGER     NOT NULL,
  data         JSONB       NOT NULL DEFAULT '{}',
  source_file  TEXT,
  uploaded_by  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sthan_contacts_location ON adwest.sthan_contacts(location_id);
CREATE INDEX IF NOT EXISTS idx_sthan_contacts_row     ON adwest.sthan_contacts(location_id, row_index);

-- Migration 062: Parent location reference
-- Allows any location to have an optional parent (e.g. Sthan → Zone, Division → Sthan).
-- Stored as plain text to match the rest of the codebase's ID conventions.

ALTER TABLE adwest.locations
  ADD COLUMN IF NOT EXISTS parent_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON adwest.locations(parent_id);

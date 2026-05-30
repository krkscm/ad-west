-- Migration 051: Add explicit Join Us visibility control on Sreni definitions
-- Ensures public Join Us form only shows Srenis explicitly enabled in Sreni CRUD.

ALTER TABLE adwest.srenies
  ADD COLUMN IF NOT EXISTS join_us_visible boolean NOT NULL DEFAULT false;

-- Defensive backfill in case older DB state introduced nullable rows.
UPDATE adwest.srenies
SET join_us_visible = false
WHERE join_us_visible IS NULL;

CREATE INDEX IF NOT EXISTS idx_srenies_join_us_visible_active
  ON adwest.srenies (name)
  WHERE active = true AND join_us_visible = true;

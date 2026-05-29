-- Migration 023: Redesign permissions as location-sreni mappings
-- Replaces the free-text code/category model with a structured location+sreni pair

-- Clear dependent data first (dev only — no prod data yet)
TRUNCATE adwest.permissions CASCADE;  -- cascades to permission_set_items

-- Drop old columns no longer needed
ALTER TABLE adwest.permissions
  DROP COLUMN IF EXISTS category;

-- Add location and sreni references
ALTER TABLE adwest.permissions
  ADD COLUMN IF NOT EXISTS location_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sreni_id    text NOT NULL DEFAULT '';

-- Remove placeholder defaults
ALTER TABLE adwest.permissions
  ALTER COLUMN location_id DROP DEFAULT,
  ALTER COLUMN sreni_id    DROP DEFAULT;

-- Drop old unique constraint on code alone; code stays but uniqueness is location+sreni
ALTER TABLE adwest.permissions
  DROP CONSTRAINT IF EXISTS uq_permissions_code;

-- Enforce unique location+sreni pair
ALTER TABLE adwest.permissions
  ADD CONSTRAINT uq_permissions_loc_sreni UNIQUE (location_id, sreni_id);

-- Code can still be unique when provided (nullable unique)
DROP INDEX IF EXISTS adwest.idx_permissions_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_code
  ON adwest.permissions (code) WHERE code IS NOT NULL AND code <> '';

-- Replace category index with location/sreni indexes
DROP INDEX IF EXISTS adwest.idx_permissions_category;
CREATE INDEX IF NOT EXISTS idx_permissions_location_id ON adwest.permissions (location_id);
CREATE INDEX IF NOT EXISTS idx_permissions_sreni_id    ON adwest.permissions (sreni_id);

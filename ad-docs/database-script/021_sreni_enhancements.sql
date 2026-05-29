-- Migration 021: Enhance adwest.srenies for admin definition management
-- Adds code, active, audit columns and makes zone_id optional

ALTER TABLE adwest.srenies
  ADD COLUMN IF NOT EXISTS code        text,
  ADD COLUMN IF NOT EXISTS active      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by  text,
  ADD COLUMN IF NOT EXISTS updated_by  text;

-- Allow srenies to be created as standalone definitions (no zone assignment required)
ALTER TABLE adwest.srenies
  ALTER COLUMN zone_id DROP NOT NULL;

-- Unique index on code (sparse — only enforced when code is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_srenies_code
  ON adwest.srenies (code)
  WHERE code IS NOT NULL;

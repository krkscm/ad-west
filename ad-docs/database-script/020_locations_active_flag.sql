-- Migration 020: Add active flag to adwest.locations
ALTER TABLE adwest.locations
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Migration 019: Unified locations table for Zone and Sthan definitions
-- Replaces the separate zone/sthan management approach with a single reference table.
-- NOTE: adwest.zones remains as the operational backbone (FK refs from srenies, contacts, etc.)
--       adwest.locations is the admin-managed master-data table for location names/codes.

CREATE TABLE IF NOT EXISTS adwest.locations (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text    UNIQUE,
  name        text    NOT NULL,
  level       text    NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_locations_level CHECK (level IN ('zone', 'sthan'))
);

CREATE INDEX IF NOT EXISTS idx_locations_level ON adwest.locations (level);

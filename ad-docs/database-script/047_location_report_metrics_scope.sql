-- Migration 047: Add scope to report_metric_definitions for location (sthan) metrics.
-- All sthans share the same reporting format — metrics are defined once under scope='location'.
-- These metrics can only be updated, never deleted or deactivated.

-- Add scope discriminator to the existing table
ALTER TABLE adwest.report_metric_definitions
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'sreni'
    CHECK (scope IN ('sreni', 'location'));

CREATE INDEX IF NOT EXISTS idx_report_metric_definitions_scope
  ON adwest.report_metric_definitions(scope);

-- Backfill: all existing rows are sreni-scoped
UPDATE adwest.report_metric_definitions SET scope = 'sreni' WHERE scope IS NULL;

-- Drop the sthan_report_metrics table created in 045 — no longer needed
-- (location metrics now live in report_metric_definitions with scope='location')
DROP TABLE IF EXISTS adwest.sthan_report_metrics;

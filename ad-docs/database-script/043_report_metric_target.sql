-- Migration 043: Add target column to report_metric_definitions
-- Enables monthly target tracking per metric in the Insights page.

BEGIN;

ALTER TABLE adwest.report_metric_definitions
  ADD COLUMN IF NOT EXISTS target NUMERIC(14, 2);

COMMIT;

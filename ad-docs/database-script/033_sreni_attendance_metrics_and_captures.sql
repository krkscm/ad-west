-- 033_sreni_attendance_metrics_and_captures.sql
-- Attendance metric definitions and per-event capture persistence for Sreni calendar.

CREATE TABLE IF NOT EXISTS adwest.sreni_attendance_metrics (
  id            text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sreni_id      text        NOT NULL,
  name          text        NOT NULL,
  description   text,
  metric_keys   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  active        boolean     NOT NULL DEFAULT true,
  created_by    text        NOT NULL,
  updated_by    text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sreni_attendance_metric_keys_array CHECK (jsonb_typeof(metric_keys) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_sreni_attendance_metrics_sreni
  ON adwest.sreni_attendance_metrics (sreni_id);

CREATE INDEX IF NOT EXISTS idx_sreni_attendance_metrics_active
  ON adwest.sreni_attendance_metrics (active);

CREATE TABLE IF NOT EXISTS adwest.sreni_event_attendance_captures (
  id            text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sreni_id      text        NOT NULL,
  event_id      text        NOT NULL,
  metric_id     text        NOT NULL,
  values_json   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  captured_by   text        NOT NULL,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sreni_event_attendance_values_object CHECK (jsonb_typeof(values_json) = 'object'),
  CONSTRAINT uq_sreni_event_attendance_event_metric UNIQUE (event_id, metric_id),
  CONSTRAINT fk_sreni_event_attendance_metric FOREIGN KEY (metric_id)
    REFERENCES adwest.sreni_attendance_metrics(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sreni_event_attendance_sreni
  ON adwest.sreni_event_attendance_captures (sreni_id);

CREATE INDEX IF NOT EXISTS idx_sreni_event_attendance_event
  ON adwest.sreni_event_attendance_captures (event_id);

CREATE INDEX IF NOT EXISTS idx_sreni_event_attendance_metric
  ON adwest.sreni_event_attendance_captures (metric_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sreni_attendance_metrics_updated_at'
      AND tgrelid = 'adwest.sreni_attendance_metrics'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_sreni_attendance_metrics_updated_at
      BEFORE UPDATE ON adwest.sreni_attendance_metrics
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sreni_event_attendance_captures_updated_at'
      AND tgrelid = 'adwest.sreni_event_attendance_captures'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_sreni_event_attendance_captures_updated_at
      BEFORE UPDATE ON adwest.sreni_event_attendance_captures
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

-- Backfill Attendance child menu under each Sreni parent menu.
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  concat(parent.key, '-attendance'),
  'Attendance',
  parent.key,
  '✅',
  30,
  parent.active,
  now(),
  now()
FROM adwest.menu_items AS parent
WHERE parent.parent_key IS NULL
  AND parent.key LIKE 'sreni-%'
  AND NOT EXISTS (
    SELECT 1
    FROM adwest.menu_items AS child
    WHERE child.key = concat(parent.key, '-attendance')
  );

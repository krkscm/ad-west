-- 032_sreni_calendar_events.sql
-- DB persistence for per-Sreni calendar events with scope-aware visibility.

CREATE TABLE IF NOT EXISTS adwest.sreni_calendar_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sreni_id      text        NOT NULL,
  title         text        NOT NULL,
  event_date    date        NOT NULL,
  start_time    time        NOT NULL,
  end_time      time        NOT NULL,
  color         text        NOT NULL DEFAULT '#6366f1',
  notes         text,
  scope         text        NOT NULL DEFAULT 'sthan', -- zone | sthan
  sthan_ids     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_by    text        NOT NULL,
  updated_by    text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sreni_calendar_scope CHECK (scope IN ('zone', 'sthan')),
  CONSTRAINT chk_sreni_calendar_sthan_ids_array CHECK (jsonb_typeof(sthan_ids) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_sreni_calendar_events_sreni_date
  ON adwest.sreni_calendar_events (sreni_id, event_date);

CREATE INDEX IF NOT EXISTS idx_sreni_calendar_events_scope
  ON adwest.sreni_calendar_events (scope);

CREATE INDEX IF NOT EXISTS idx_sreni_calendar_events_sthan_ids_gin
  ON adwest.sreni_calendar_events USING gin (sthan_ids jsonb_path_ops);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sreni_calendar_events_updated_at'
      AND tgrelid = 'adwest.sreni_calendar_events'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_sreni_calendar_events_updated_at
      BEFORE UPDATE ON adwest.sreni_calendar_events
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

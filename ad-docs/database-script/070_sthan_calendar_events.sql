-- 070_sthan_calendar_events.sql
-- Per-sthan calendar events so each Sthan can plan its own schedule.

CREATE TABLE IF NOT EXISTS adwest.sthan_calendar_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   UUID        NOT NULL REFERENCES adwest.locations(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  event_date    DATE        NOT NULL,
  start_time    TIME        NOT NULL,
  end_time      TIME        NOT NULL,
  color         TEXT        NOT NULL DEFAULT '#6366f1',
  notes         TEXT,
  created_by    TEXT        NOT NULL,
  updated_by    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sthan_calendar_events_location_date
  ON adwest.sthan_calendar_events (location_id, event_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sthan_calendar_events_updated_at'
      AND tgrelid = 'adwest.sthan_calendar_events'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_sthan_calendar_events_updated_at
      BEFORE UPDATE ON adwest.sthan_calendar_events
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

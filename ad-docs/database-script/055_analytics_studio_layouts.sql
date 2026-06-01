-- 055_analytics_studio_layouts.sql
-- Persist per-user Analytics Studio layouts for Details and Pivot tabs.

CREATE TABLE IF NOT EXISTS adwest.analytics_studio_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreni_id varchar(100) NOT NULL,
  user_id varchar(100) NOT NULL,
  layout_type varchar(20) NOT NULL,
  name varchar(160) NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_analytics_studio_layouts_type CHECK (layout_type IN ('details', 'pivot')),
  UNIQUE (sreni_id, user_id, layout_type, name)
);

CREATE INDEX IF NOT EXISTS idx_analytics_studio_layouts_owner
  ON adwest.analytics_studio_layouts (sreni_id, user_id, layout_type, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_analytics_studio_layouts_updated_at'
  ) THEN
    CREATE TRIGGER trg_analytics_studio_layouts_updated_at
    BEFORE UPDATE ON adwest.analytics_studio_layouts
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;
END;
$$;
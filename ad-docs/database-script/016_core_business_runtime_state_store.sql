-- ADWest PostgreSQL migration: Core Business runtime state store
-- Provides DB-backed snapshot persistence for Core Business service runtime state.

CREATE TABLE IF NOT EXISTS adwest.core_business_runtime_state (
  id varchar(64) PRIMARY KEY,
  state_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_core_business_runtime_state_updated_at'
  ) THEN
    CREATE TRIGGER trg_core_business_runtime_state_updated_at
    BEFORE UPDATE ON adwest.core_business_runtime_state
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;
END;
$$;


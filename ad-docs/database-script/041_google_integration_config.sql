-- Migration 041: Google Integration Configuration (DB-backed settings)
BEGIN;

CREATE TABLE IF NOT EXISTS adwest.integration_google_config (
  id            VARCHAR(32) PRIMARY KEY,
  client_id     TEXT,
  client_secret TEXT,
  redirect_uri  TEXT,
  oauth_scopes  TEXT,
  web_app_origin TEXT,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by    VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO adwest.integration_google_config (
  id,
  client_id,
  client_secret,
  redirect_uri,
  oauth_scopes,
  web_app_origin,
  enabled,
  updated_at
)
VALUES (
  'default',
  '653659463926-tt1k4egcm66j5d2k5r4sc47m8sdjipmg.apps.googleusercontent.com',
  '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',
  'http://localhost:3001/api/v1/auth/google/callback',
  'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly',
  'http://localhost:3000',
  TRUE,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_integration_google_config_updated_at ON adwest.integration_google_config;
CREATE TRIGGER trg_integration_google_config_updated_at
  BEFORE UPDATE ON adwest.integration_google_config
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES (
  'menu_settings_google_integration',
  'settings-google-integration',
  'Google Integration',
  'settings',
  '🔐',
  95,
  TRUE,
  NOW()::text,
  NOW()::text
)
ON CONFLICT (key) DO NOTHING;

COMMIT;

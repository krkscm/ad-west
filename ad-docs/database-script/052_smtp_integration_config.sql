-- Migration 052: SMTP Integration Configuration (DB-backed settings)
BEGIN;

CREATE TABLE IF NOT EXISTS adwest.integration_smtp_config (
  id          VARCHAR(32) PRIMARY KEY,
  host        TEXT,
  port        INTEGER NOT NULL DEFAULT 587,
  username    TEXT,
  password    TEXT,
  from_name   TEXT,
  encryption  VARCHAR(20) NOT NULL DEFAULT 'TLS',
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by  VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO adwest.integration_smtp_config (
  id, host, port, username, password, from_name, encryption, enabled, updated_at
)
VALUES (
  'default',
  'smtp.gmail.com',
  587,
  'auhwesthelpdesk@gmail.com',
  'ygcpyswldypayfgy',
  'AD West Helpdesk',
  'TLS',
  TRUE,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_integration_smtp_config_updated_at ON adwest.integration_smtp_config;
CREATE TRIGGER trg_integration_smtp_config_updated_at
  BEFORE UPDATE ON adwest.integration_smtp_config
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES (
  'menu_settings_smtp_integration',
  'settings-smtp-integration',
  'Email Integration',
  'settings',
  '📧',
  96,
  TRUE,
  NOW()::text,
  NOW()::text
)
ON CONFLICT (key) DO NOTHING;

COMMIT;

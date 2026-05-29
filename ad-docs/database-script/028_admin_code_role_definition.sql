-- ADWest admin user model update
-- Adds code-based admin identity and role-definition linkage.

ALTER TABLE IF EXISTS adwest.auth_admin_users
  ADD COLUMN IF NOT EXISTS code varchar(40),
  ADD COLUMN IF NOT EXISTS role_definition_id varchar(64);

UPDATE adwest.auth_admin_users
SET code = COALESCE(
  code,
  UPPER(REPLACE(SPLIT_PART(email, '@', 1), '.', '_'))
)
WHERE code IS NULL OR btrim(code) = '';

ALTER TABLE IF EXISTS adwest.auth_admin_users
  ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_admin_users_code ON adwest.auth_admin_users(code);
CREATE INDEX IF NOT EXISTS idx_auth_admin_users_role_definition_id ON adwest.auth_admin_users(role_definition_id);

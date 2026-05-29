-- 038_auth_login_performance_indexes.sql
-- Adds targeted indexes to speed up login identifier lookups on adwest.users.

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_code
  ON adwest.users (code);

CREATE INDEX IF NOT EXISTS idx_users_phone
  ON adwest.users (phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE INDEX IF NOT EXISTS idx_users_lower_email
  ON adwest.users (lower(email))
  WHERE email IS NOT NULL AND email <> '';

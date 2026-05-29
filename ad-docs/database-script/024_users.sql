-- Migration 024: Application users
-- Users with role+sthan assignment for access control

CREATE TABLE IF NOT EXISTS adwest.users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL,
  name        text        NOT NULL,
  phone       text,
  email       text,
  role_id     text,
  sthan_id    text,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  updated_by  text,
  CONSTRAINT uq_users_code UNIQUE (code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON adwest.users (email) WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS idx_users_role_id   ON adwest.users (role_id);
CREATE INDEX IF NOT EXISTS idx_users_sthan_id  ON adwest.users (sthan_id);
CREATE INDEX IF NOT EXISTS idx_users_active    ON adwest.users (active);
CREATE INDEX IF NOT EXISTS idx_users_name      ON adwest.users (name);

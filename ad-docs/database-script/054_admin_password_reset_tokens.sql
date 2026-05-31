-- Migration 054: Admin password reset tokens for forgot-password email flow
BEGIN;

CREATE TABLE IF NOT EXISTS adwest.admin_password_reset_tokens (
  token       VARCHAR(128) PRIMARY KEY,
  user_email  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_password_reset_tokens_email
  ON adwest.admin_password_reset_tokens (user_email);

CREATE INDEX IF NOT EXISTS idx_admin_password_reset_tokens_expires_at
  ON adwest.admin_password_reset_tokens (expires_at);

COMMIT;

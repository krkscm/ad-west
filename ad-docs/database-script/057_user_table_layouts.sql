-- Migration 057: User table layout preferences for column visibility/ordering
BEGIN;

CREATE TABLE IF NOT EXISTS adwest.user_table_layouts (
  id          VARCHAR(64)  PRIMARY KEY,
  user_id     VARCHAR(64)  NOT NULL,
  table_key   VARCHAR(120) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  columns     JSONB        NOT NULL DEFAULT '[]',
  is_active   BOOLEAN      NOT NULL DEFAULT false,
  created_at  VARCHAR(40)  NOT NULL,
  updated_at  VARCHAR(40)  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_table_layouts_user_key
  ON adwest.user_table_layouts(user_id, table_key);

COMMIT;

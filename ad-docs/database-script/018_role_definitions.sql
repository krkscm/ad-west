-- ADWest role definitions persistence
-- Adds CRUD persistence table for Settings > Roles Definition.

CREATE TABLE IF NOT EXISTS adwest.role_definitions (
  id varchar(64) PRIMARY KEY,
  code varchar(40) NOT NULL,
  name varchar(120) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  level varchar(16) NOT NULL CHECK (level IN ('ZONE', 'STHAN')),
  created_by varchar(64) NOT NULL,
  created_at varchar(40) NOT NULL,
  updated_by varchar(64) NOT NULL,
  updated_at varchar(40) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_definitions_code_lower
  ON adwest.role_definitions (lower(code));

CREATE INDEX IF NOT EXISTS idx_role_definitions_active
  ON adwest.role_definitions (active);

CREATE INDEX IF NOT EXISTS idx_role_definitions_level
  ON adwest.role_definitions (level);

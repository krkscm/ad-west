-- Migration 022: Policy-based permission engine
-- permissions → permission_sets → permission_set_items

-- Atomic permission definitions (admin-defined)
CREATE TABLE IF NOT EXISTS adwest.permissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL,
  name        text        NOT NULL,
  category    text,
  description text,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  updated_by  text,
  CONSTRAINT uq_permissions_code UNIQUE (code)
);

-- Named bundles of permissions
CREATE TABLE IF NOT EXISTS adwest.permission_sets (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  updated_by  text,
  CONSTRAINT uq_permission_sets_name UNIQUE (name)
);

-- Many-to-many: which permissions belong to which set
CREATE TABLE IF NOT EXISTS adwest.permission_set_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_set_id uuid        NOT NULL REFERENCES adwest.permission_sets(id) ON DELETE CASCADE,
  permission_id     uuid        NOT NULL REFERENCES adwest.permissions(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_psi_set_perm UNIQUE (permission_set_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_psi_set               ON adwest.permission_set_items (permission_set_id);
CREATE INDEX IF NOT EXISTS idx_permissions_category   ON adwest.permissions (category);

-- ADWest menu management persistence
-- Adds tables for DB-driven menu definitions and per-admin menu grants.

-- ─── menu_items ───────────────────────────────────────────────────────────────
-- Stores every navigable menu item. parent_key = NULL means top-level.
CREATE TABLE IF NOT EXISTS adwest.menu_items (
  id          varchar(64)  PRIMARY KEY,
  key         varchar(80)  NOT NULL,
  label       varchar(120) NOT NULL,
  parent_key  varchar(80)  DEFAULT NULL,
  icon        varchar(40)  DEFAULT NULL,
  sort_order  int          NOT NULL DEFAULT 0,
  active      boolean      NOT NULL DEFAULT true,
  created_at  varchar(40)  NOT NULL,
  updated_at  varchar(40)  NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_items_key
  ON adwest.menu_items (key);

CREATE INDEX IF NOT EXISTS idx_menu_items_parent_key
  ON adwest.menu_items (parent_key);

CREATE INDEX IF NOT EXISTS idx_menu_items_active
  ON adwest.menu_items (active);

-- ─── admin_menu_grants ────────────────────────────────────────────────────────
-- Stores which menu keys are explicitly granted to an admin user.
-- An empty grant set means the admin has the default role-based access.
CREATE TABLE IF NOT EXISTS adwest.admin_menu_grants (
  id            varchar(64) PRIMARY KEY,
  admin_user_id varchar(64) NOT NULL,
  menu_key      varchar(80) NOT NULL,
  granted_by    varchar(64) NOT NULL,
  granted_at    varchar(40) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_menu_grants_user_key
  ON adwest.admin_menu_grants (admin_user_id, menu_key);

CREATE INDEX IF NOT EXISTS idx_admin_menu_grants_user
  ON adwest.admin_menu_grants (admin_user_id);

-- ─── Seed default menus ───────────────────────────────────────────────────────
INSERT INTO adwest.menu_items (id, key, label, parent_key, icon, sort_order, active, created_at, updated_at)
VALUES
  ('menu_dashboard',              'dashboard',                   'Dashboard',           NULL,       '📊', 10,  true, NOW()::text, NOW()::text),
  ('menu_approvals',              'approvals',                   'Approvals',           NULL,       '📝', 20,  true, NOW()::text, NOW()::text),
  ('menu_logs',                   'logs',                        'Audit Logs',          NULL,       '🗂️', 30, true, NOW()::text, NOW()::text),
  ('menu_imports',                'imports',                     'Import Reconciliation',NULL,      '📥', 40,  true, NOW()::text, NOW()::text),
  ('menu_ticket_activity',        'ticket-activity',             'Ticket Activity',     NULL,       '📜', 50,  true, NOW()::text, NOW()::text),
  ('menu_ops',                    'ops',                         'Ops Coverage',        NULL,       '🧪', 60,  true, NOW()::text, NOW()::text),
  ('menu_settings',               'settings',                    'Settings',            NULL,       '⚙️', 70, true, NOW()::text, NOW()::text),
  ('menu_settings_admins',        'settings-admins',             'Admin Management',    'settings', '🔑', 10,  true, NOW()::text, NOW()::text),
  ('menu_settings_roles',         'settings-roles-definition',   'Roles Definition',    'settings', NULL, 20,  true, NOW()::text, NOW()::text),
  ('menu_settings_location',      'settings-location-definition','Location Definition', 'settings', NULL, 30,  true, NOW()::text, NOW()::text),
  ('menu_settings_sreni',         'settings-sreni-definition',   'Sreni Definition',    'settings', NULL, 40,  true, NOW()::text, NOW()::text),
  ('menu_settings_permissions',   'settings-permissions',        'Permissions',         'settings', NULL, 50,  true, NOW()::text, NOW()::text),
  ('menu_settings_perm_sets',     'settings-permission-sets',    'Permission Sets',     'settings', NULL, 60,  true, NOW()::text, NOW()::text),
  ('menu_settings_users',         'settings-users',              'Users',               'settings', NULL, 70,  true, NOW()::text, NOW()::text),
  ('menu_settings_menus',         'settings-menu-management',    'Menu Management',     'settings', '🗂️', 80, true, NOW()::text, NOW()::text)
ON CONFLICT (key) DO NOTHING;

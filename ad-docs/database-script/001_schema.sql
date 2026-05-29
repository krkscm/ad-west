-- ADWest PostgreSQL schema bootstrap
-- Safe for first-time setup. Run after 000_extensions.sql.

CREATE SCHEMA IF NOT EXISTS adwest;

CREATE TABLE IF NOT EXISTS adwest.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  description text,
  logo_url text,
  address text,
  active_year integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_zones_active_year CHECK (active_year IS NULL OR active_year BETWEEN 2000 AND 2100)
);

CREATE TABLE IF NOT EXISTS adwest.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  totp_secret text,
  mfa_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS adwest.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  role_id text,
  sthan_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  CONSTRAINT uq_users_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS adwest.srenies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES adwest.zones(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  is_service_sreny boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_id, name)
);

CREATE TABLE IF NOT EXISTS adwest.gov_body_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE CASCADE,
  year integer NOT NULL,
  positions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_gov_body_year CHECK (year BETWEEN 2000 AND 2100),
  UNIQUE (sreny_id, year)
);

CREATE TABLE IF NOT EXISTS adwest.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  category text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  venue text,
  max_participants integer,
  status text NOT NULL DEFAULT 'draft',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_programs_date_window CHECK (end_date >= start_date),
  CONSTRAINT chk_programs_status CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT chk_programs_max_participants CHECK (max_participants IS NULL OR max_participants > 0)
);

CREATE TABLE IF NOT EXISTS adwest.program_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES adwest.programs(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_program_sessions_time_window CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS adwest.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES adwest.programs(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES adwest.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'registered',
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_registration_status CHECK (status IN ('registered', 'waitlisted', 'cancelled')),
  UNIQUE (program_id, contact_id)
);

CREATE TABLE IF NOT EXISTS adwest.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES adwest.program_sessions(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES adwest.users(id) ON DELETE RESTRICT,
  status text NOT NULL,
  method text,
  marked_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_attendance_status CHECK (status IN ('present', 'absent', 'late', 'excused')),
  UNIQUE (session_id, contact_id)
);

CREATE TABLE IF NOT EXISTS adwest.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES adwest.admin_users(id) ON DELETE CASCADE,
  role text NOT NULL,
  scope_type text NOT NULL,
  scope_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_role_assignment_role CHECK (role IN ('SUPER_ADMIN', 'ZONE_ADMIN', 'SRENY_ADMIN')),
  CONSTRAINT chk_role_assignment_scope_type CHECK (scope_type IN ('global', 'zone', 'sreny')),
  CONSTRAINT chk_role_assignment_scope CHECK (
    (scope_type = 'global' AND scope_id IS NULL) OR
    (scope_type IN ('zone', 'sreny') AND scope_id IS NOT NULL)
  ),
  UNIQUE (admin_user_id, role, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS adwest.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_val jsonb,
  new_val jsonb,
  ts timestamptz NOT NULL DEFAULT now()
);

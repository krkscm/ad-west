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

CREATE TABLE IF NOT EXISTS adwest.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES adwest.zones(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_primary text,
  phone_secondary text,
  email_primary citext,
  email_secondary citext,
  whatsapp text,
  dob date,
  gender text,
  address text,
  photo_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_contacts_status CHECK (status IN ('active', 'inactive', 'deleted'))
);

CREATE TABLE IF NOT EXISTS adwest.sreny_memberships (
  contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE CASCADE,
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE CASCADE,
  joined_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, sreny_id),
  CONSTRAINT chk_membership_status CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS adwest.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES adwest.zones(id) ON DELETE RESTRICT,
  filename text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_import_status CHECK (status IN ('processing', 'ready_for_review', 'finalized', 'failed'))
);

CREATE TABLE IF NOT EXISTS adwest.dedup_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES adwest.import_batches(id) ON DELETE CASCADE,
  incoming jsonb NOT NULL,
  matched_contact_id uuid REFERENCES adwest.contacts(id) ON DELETE SET NULL,
  resolution text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_dedup_resolution CHECK (resolution IN ('pending', 'merged', 'skipped', 'new'))
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
  contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE RESTRICT,
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
  contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE RESTRICT,
  status text NOT NULL,
  method text,
  marked_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_attendance_status CHECK (status IN ('present', 'absent', 'late', 'excused')),
  UNIQUE (session_id, contact_id)
);

CREATE TABLE IF NOT EXISTS adwest.helpdesk_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE RESTRICT,
  zone_id uuid NOT NULL REFERENCES adwest.zones(id) ON DELETE RESTRICT,
  category text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT chk_ticket_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT chk_ticket_status CHECK (status IN ('new', 'assigned', 'in_progress', 'resolved', 'closed'))
);

CREATE TABLE IF NOT EXISTS adwest.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES adwest.helpdesk_tickets(id) ON DELETE CASCADE,
  author_id uuid,
  author_type text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_comment_author_type CHECK (author_type IN ('admin', 'member', 'system'))
);

CREATE TABLE IF NOT EXISTS adwest.edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE RESTRICT,
  requested_fields jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_edit_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
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

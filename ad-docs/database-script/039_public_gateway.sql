-- Migration 039: Public Gateway — Helpdesk Tickets, Job Postings, Job Applications
-- Values are plain text (validated via adwest.enum_values / Reference Data).
-- No PostgreSQL ENUM types — avoids a later 069 conversion on fresh installs.

BEGIN;

CREATE TABLE IF NOT EXISTS adwest.helpdesk_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 200),
  phone         TEXT NOT NULL CHECK (char_length(phone) >= 7 AND char_length(phone) <= 30),
  email         TEXT,
  category      TEXT NOT NULL DEFAULT 'general',
  subject       TEXT NOT NULL CHECK (char_length(subject) >= 5 AND char_length(subject) <= 300),
  description   TEXT NOT NULL CHECK (char_length(description) >= 10),
  status        TEXT NOT NULL DEFAULT 'open',
  assigned_to   VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_status ON adwest.helpdesk_tickets (status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_created_at ON adwest.helpdesk_tickets (created_at DESC);

CREATE TABLE IF NOT EXISTS adwest.job_postings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 300),
  description   TEXT NOT NULL CHECK (char_length(description) >= 20),
  requirements  TEXT,
  location      TEXT,
  type          TEXT NOT NULL DEFAULT 'full_time',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at    TIMESTAMPTZ,
  created_by    VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_is_active ON adwest.job_postings (is_active);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON adwest.job_postings (created_at DESC);

CREATE TABLE IF NOT EXISTS adwest.job_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES adwest.job_postings(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 200),
  phone         TEXT NOT NULL CHECK (char_length(phone) >= 7 AND char_length(phone) <= 30),
  email         TEXT,
  resume_url    TEXT,
  resume_storage_path TEXT,
  resume_original_name TEXT,
  resume_mime_type VARCHAR(255),
  resume_size_bytes INTEGER,
  cover_letter  TEXT,
  status        TEXT NOT NULL DEFAULT 'new',
  notes         TEXT,
  reviewed_by   VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON adwest.job_applications (job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON adwest.job_applications (status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON adwest.job_applications (created_at DESC);

CREATE OR REPLACE FUNCTION adwest.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_helpdesk_tickets_updated_at ON adwest.helpdesk_tickets;
CREATE TRIGGER trg_helpdesk_tickets_updated_at
  BEFORE UPDATE ON adwest.helpdesk_tickets
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

DROP TRIGGER IF EXISTS trg_job_postings_updated_at ON adwest.job_postings;
CREATE TRIGGER trg_job_postings_updated_at
  BEFORE UPDATE ON adwest.job_postings
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

DROP TRIGGER IF EXISTS trg_job_applications_updated_at ON adwest.job_applications;
CREATE TRIGGER trg_job_applications_updated_at
  BEFORE UPDATE ON adwest.job_applications
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

COMMIT;

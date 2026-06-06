-- Migration 040: Member Services — Reimbursements, Special Events, Notifications
-- Values are plain text (validated via adwest.enum_values / Reference Data).
-- No PostgreSQL ENUM types — avoids a later 069 conversion on fresh installs.

BEGIN;

CREATE TABLE IF NOT EXISTS adwest.reimbursement_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by         VARCHAR(64) NOT NULL REFERENCES adwest.auth_admin_users(id) ON DELETE CASCADE,
  category             TEXT NOT NULL DEFAULT 'other',
  description          TEXT NOT NULL CHECK (char_length(description) >= 5),
  amount               NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency             VARCHAR(10) NOT NULL DEFAULT 'AED',
  receipt_url          TEXT,
  receipt_storage_path TEXT,
  receipt_original_name TEXT,
  receipt_mime_type    VARCHAR(255),
  status               TEXT NOT NULL DEFAULT 'draft',
  reviewer_notes       TEXT,
  reviewed_by          VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_submitted_by ON adwest.reimbursement_requests (submitted_by);
CREATE INDEX IF NOT EXISTS idx_reimbursement_status ON adwest.reimbursement_requests (status);
CREATE INDEX IF NOT EXISTS idx_reimbursement_created_at ON adwest.reimbursement_requests (created_at DESC);

CREATE TABLE IF NOT EXISTS adwest.special_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 300),
  description           TEXT,
  date_time             TIMESTAMPTZ NOT NULL,
  end_date_time         TIMESTAMPTZ,
  venue                 TEXT,
  is_public             BOOLEAN NOT NULL DEFAULT FALSE,
  registration_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_events_date_time ON adwest.special_events (date_time);
CREATE INDEX IF NOT EXISTS idx_special_events_created_at ON adwest.special_events (created_at DESC);

CREATE TABLE IF NOT EXISTS adwest.event_sreni_links (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  UUID NOT NULL REFERENCES adwest.special_events(id) ON DELETE CASCADE,
  sreni_id  VARCHAR(64) NOT NULL,
  UNIQUE (event_id, sreni_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sreni_links_event_id ON adwest.event_sreni_links (event_id);
CREATE INDEX IF NOT EXISTS idx_event_sreni_links_sreni_id ON adwest.event_sreni_links (sreni_id);

CREATE TABLE IF NOT EXISTS adwest.event_form_fields (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES adwest.special_events(id) ON DELETE CASCADE,
  field_type   TEXT NOT NULL DEFAULT 'text',
  label        TEXT NOT NULL CHECK (char_length(label) >= 1 AND char_length(label) <= 200),
  placeholder  TEXT,
  options      JSONB,
  is_required  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_event_form_fields_event_id ON adwest.event_form_fields (event_id, sort_order);

CREATE TABLE IF NOT EXISTS adwest.event_registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES adwest.special_events(id) ON DELETE CASCADE,
  form_data    JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON adwest.event_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_submitted_at ON adwest.event_registrations (submitted_at DESC);

CREATE TABLE IF NOT EXISTS adwest.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 300),
  message     TEXT NOT NULL CHECK (char_length(message) >= 5),
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to    TIMESTAMPTZ NOT NULL,
  target      TEXT NOT NULL DEFAULT 'all',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  VARCHAR(64) REFERENCES adwest.auth_admin_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_valid_to ON adwest.notifications (valid_to);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON adwest.notifications (is_active);

DROP TRIGGER IF EXISTS trg_reimbursement_requests_updated_at ON adwest.reimbursement_requests;
CREATE TRIGGER trg_reimbursement_requests_updated_at
  BEFORE UPDATE ON adwest.reimbursement_requests
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

DROP TRIGGER IF EXISTS trg_special_events_updated_at ON adwest.special_events;
CREATE TRIGGER trg_special_events_updated_at
  BEFORE UPDATE ON adwest.special_events
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON adwest.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON adwest.notifications
  FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();

COMMIT;

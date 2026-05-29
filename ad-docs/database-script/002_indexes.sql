-- ADWest PostgreSQL performance indexes
-- Run after 001_schema.sql.

-- Core relationship indexes
CREATE INDEX IF NOT EXISTS idx_srenies_zone_id ON adwest.srenies(zone_id);
CREATE INDEX IF NOT EXISTS idx_contacts_zone_id ON adwest.contacts(zone_id);
CREATE INDEX IF NOT EXISTS idx_memberships_sreny_id ON adwest.sreny_memberships(sreny_id);
CREATE INDEX IF NOT EXISTS idx_programs_sreny_id ON adwest.programs(sreny_id);
CREATE INDEX IF NOT EXISTS idx_program_sessions_program_id ON adwest.program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_registrations_contact_id ON adwest.registrations(contact_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON adwest.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_contact_id ON adwest.attendance(contact_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_contact_id ON adwest.helpdesk_tickets(contact_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_zone_id ON adwest.helpdesk_tickets(zone_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON adwest.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_contact_id ON adwest.edit_requests(contact_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_admin_user_id ON adwest.role_assignments(admin_user_id);

-- Timeline and status indexes
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON adwest.import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_programs_status_dates ON adwest.programs(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_helpdesk_status_created_at ON adwest.helpdesk_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status_created_at ON adwest.edit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON adwest.audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_ts ON adwest.audit_logs(entity_type, entity_id, ts DESC);

-- Partial indexes for high-frequency operational queries
CREATE INDEX IF NOT EXISTS idx_contacts_active_zone
  ON adwest.contacts(zone_id, id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_helpdesk_open_tickets
  ON adwest.helpdesk_tickets(zone_id, priority, created_at DESC)
  WHERE status IN ('new', 'assigned', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_edit_requests_pending
  ON adwest.edit_requests(created_at DESC)
  WHERE status = 'pending';

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm
  ON adwest.contacts
  USING gin (lower(first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contacts_email_primary ON adwest.contacts(email_primary);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_primary ON adwest.contacts(phone_primary);

-- JSONB indexes
CREATE INDEX IF NOT EXISTS idx_dedup_candidates_incoming_gin
  ON adwest.dedup_candidates USING gin (incoming jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_edit_requests_fields_gin
  ON adwest.edit_requests USING gin (requested_fields jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_audit_logs_old_val_gin
  ON adwest.audit_logs USING gin (old_val jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_audit_logs_new_val_gin
  ON adwest.audit_logs USING gin (new_val jsonb_path_ops);

-- BRIN index for very large append-only audit timelines
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts_brin
  ON adwest.audit_logs USING brin (ts);

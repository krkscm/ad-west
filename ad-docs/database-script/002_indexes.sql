-- ADWest PostgreSQL performance indexes
-- Run after 001_schema.sql.

-- Core relationship indexes
CREATE INDEX IF NOT EXISTS idx_srenies_zone_id ON adwest.srenies(zone_id);
CREATE INDEX IF NOT EXISTS idx_programs_sreny_id ON adwest.programs(sreny_id);
CREATE INDEX IF NOT EXISTS idx_program_sessions_program_id ON adwest.program_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_registrations_contact_id ON adwest.registrations(contact_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON adwest.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_contact_id ON adwest.attendance(contact_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_admin_user_id ON adwest.role_assignments(admin_user_id);

-- Timeline and status indexes
CREATE INDEX IF NOT EXISTS idx_programs_status_dates ON adwest.programs(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON adwest.audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_ts ON adwest.audit_logs(entity_type, entity_id, ts DESC);

-- Partial indexes for high-frequency operational queries
-- Search indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_old_val_gin
  ON adwest.audit_logs USING gin (old_val jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_audit_logs_new_val_gin
  ON adwest.audit_logs USING gin (new_val jsonb_path_ops);

-- BRIN index for very large append-only audit timelines
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts_brin
  ON adwest.audit_logs USING brin (ts);

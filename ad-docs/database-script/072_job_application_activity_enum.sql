-- 072_job_application_activity_enum.sql
-- Move timeline action types to Reference Data (job_application_activity enum type).
-- Drops the hardcoded CHECK so new values can be added via Settings → Reference Data
-- (system code still decides when each action is logged).

-- Drop inline CHECK from 071 (name may vary; search pg_constraint if this fails).
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'adwest.job_application_activities'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%action%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE adwest.job_application_activities DROP CONSTRAINT %I', cname);
  END IF;
END;
$$;

INSERT INTO adwest.enum_values (id, enum_type, value, label, sort_order, active, parent_value, created_at, updated_at)
VALUES
  ('ev-job_app_act-submitted', 'job_application_activity', 'submitted', 'Application submitted', 10, true, NULL, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  ('ev-job_app_act-status-changed', 'job_application_activity', 'status_changed', 'Status updated', 20, true, NULL, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  ('ev-job_app_act-note-updated', 'job_application_activity', 'note_updated', 'Internal notes updated', 30, true, NULL, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  ('ev-job_app_act-follow-up', 'job_application_activity', 'follow_up', 'Follow-up recorded', 40, true, NULL, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
ON CONFLICT (id) DO UPDATE SET
  enum_type = EXCLUDED.enum_type,
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = EXCLUDED.updated_at;

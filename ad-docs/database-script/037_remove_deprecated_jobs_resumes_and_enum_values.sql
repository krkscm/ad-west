-- 037_remove_deprecated_jobs_resumes_and_enum_values.sql
-- Decommission deprecated jobs/resumes persistence and remove enum rows for deprecated modules.

DROP TABLE IF EXISTS adwest.job_interests;
DROP TABLE IF EXISTS adwest.job_listings;
DROP TABLE IF EXISTS adwest.resumes;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'adwest' AND table_name = 'enum_values'
  ) THEN
    DELETE FROM adwest.enum_values
    WHERE enum_type IN (
      'program_status',
      'attendance_state',
      'ticket_priority',
      'ticket_status',
      'ticket_activity_action',
      'job_type',
      'job_listing_status',
      'member_edit_status',
      'import_file_type',
      'import_status',
      'dedup_decision'
    )
    OR (enum_type = 'approval_target_type' AND value IN ('member_edit_request', 'job_listing'));
  END IF;
END $$;

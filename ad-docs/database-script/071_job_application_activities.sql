-- 071_job_application_activities.sql
-- Timeline / audit trail for job application lifecycle tracking.

CREATE TABLE IF NOT EXISTS adwest.job_application_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES adwest.job_applications(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT,
  comment         TEXT,
  actor_id        VARCHAR(64),
  actor_label     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_application_activities_application
  ON adwest.job_application_activities (application_id, created_at ASC);

-- Backfill initial "submitted" entries for existing applications.
INSERT INTO adwest.job_application_activities (application_id, action, to_status, actor_label, created_at)
SELECT ja.id, 'submitted', ja.status, ja.name, ja.created_at
FROM adwest.job_applications ja
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.job_application_activities a
  WHERE a.application_id = ja.id AND a.action = 'submitted'
);

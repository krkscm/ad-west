-- ADWest PostgreSQL migration: persist approval workflow/item runtime metadata used by Core Business DB mode

ALTER TABLE IF EXISTS adwest.approval_workflows
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'sequential',
  ADD COLUMN IF NOT EXISTS escalation_hours integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_approval_workflows_mode'
      AND conrelid = 'adwest.approval_workflows'::regclass
  ) THEN
    ALTER TABLE adwest.approval_workflows
      ADD CONSTRAINT chk_approval_workflows_mode
      CHECK (mode IN ('single', 'sequential', 'parallel_any'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_approval_workflows_escalation_hours'
      AND conrelid = 'adwest.approval_workflows'::regclass
  ) THEN
    ALTER TABLE adwest.approval_workflows
      ADD CONSTRAINT chk_approval_workflows_escalation_hours
      CHECK (escalation_hours IS NULL OR (escalation_hours BETWEEN 1 AND 240));
  END IF;
END $$;

ALTER TABLE IF EXISTS adwest.approval_items
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS audit_trail jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_approval_items_due_at
  ON adwest.approval_items(due_at)
  WHERE status = 'pending';


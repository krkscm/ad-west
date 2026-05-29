-- Migration 042: Drop FK constraints on audit fields in member-services tables
-- created_by / reviewed_by are informational audit columns.
-- Enforcing FK here breaks when admins are created via in-memory mode
-- before DB persistence is enabled, or when admin records are not yet synced.
-- submitted_by in reimbursements is kept NOT NULL but without FK for the same reason.

BEGIN;

-- ─── reimbursement_requests ───────────────────────────────────────────────────

ALTER TABLE adwest.reimbursement_requests
  DROP CONSTRAINT IF EXISTS reimbursement_requests_submitted_by_fkey;

ALTER TABLE adwest.reimbursement_requests
  DROP CONSTRAINT IF EXISTS reimbursement_requests_reviewed_by_fkey;

-- ─── special_events ───────────────────────────────────────────────────────────

ALTER TABLE adwest.special_events
  DROP CONSTRAINT IF EXISTS special_events_created_by_fkey;

-- ─── notifications ────────────────────────────────────────────────────────────

ALTER TABLE adwest.notifications
  DROP CONSTRAINT IF EXISTS notifications_created_by_fkey;

COMMIT;

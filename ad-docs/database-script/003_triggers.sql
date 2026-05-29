-- ADWest PostgreSQL timestamp maintenance triggers
-- Run after 001_schema.sql.

CREATE OR REPLACE FUNCTION adwest.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_zones_updated_at'
  ) THEN
    CREATE TRIGGER trg_zones_updated_at
    BEFORE UPDATE ON adwest.zones
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_admin_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_admin_users_updated_at
    BEFORE UPDATE ON adwest.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_srenies_updated_at'
  ) THEN
    CREATE TRIGGER trg_srenies_updated_at
    BEFORE UPDATE ON adwest.srenies
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_gov_body_structures_updated_at'
  ) THEN
    CREATE TRIGGER trg_gov_body_structures_updated_at
    BEFORE UPDATE ON adwest.gov_body_structures
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_contacts_updated_at'
  ) THEN
    CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON adwest.contacts
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sreny_memberships_updated_at'
  ) THEN
    CREATE TRIGGER trg_sreny_memberships_updated_at
    BEFORE UPDATE ON adwest.sreny_memberships
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_programs_updated_at'
  ) THEN
    CREATE TRIGGER trg_programs_updated_at
    BEFORE UPDATE ON adwest.programs
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_program_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_program_sessions_updated_at
    BEFORE UPDATE ON adwest.program_sessions
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_registrations_updated_at'
  ) THEN
    CREATE TRIGGER trg_registrations_updated_at
    BEFORE UPDATE ON adwest.registrations
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_attendance_updated_at'
  ) THEN
    CREATE TRIGGER trg_attendance_updated_at
    BEFORE UPDATE ON adwest.attendance
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_helpdesk_tickets_updated_at'
  ) THEN
    CREATE TRIGGER trg_helpdesk_tickets_updated_at
    BEFORE UPDATE ON adwest.helpdesk_tickets
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_edit_requests_updated_at'
  ) THEN
    CREATE TRIGGER trg_edit_requests_updated_at
    BEFORE UPDATE ON adwest.edit_requests
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_role_assignments_updated_at'
  ) THEN
    CREATE TRIGGER trg_role_assignments_updated_at
    BEFORE UPDATE ON adwest.role_assignments
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;
END;
$$;

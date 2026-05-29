-- 035_remove_deprecated_program_session_registration_legacy_attendance.sql
-- Decommission deprecated Program/Session/Registration and legacy attendance report persistence.
-- NOTE: This does not affect Sreni calendar attendance runtime tables.

DROP TABLE IF EXISTS adwest.attendance;
DROP TABLE IF EXISTS adwest.registrations;
DROP TABLE IF EXISTS adwest.program_sessions;
DROP TABLE IF EXISTS adwest.programs;

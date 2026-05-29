-- ADWest auth cleanup migration
-- Run after 012_auth_security_hardening.sql.
-- Removes legacy OTP/MFA schema objects that are no longer used by password+captcha auth flows.

DROP INDEX IF EXISTS adwest.idx_auth_otp_requests_member_id;
DROP INDEX IF EXISTS adwest.idx_auth_otp_requests_expires_at;
DROP TABLE IF EXISTS adwest.auth_otp_requests;

ALTER TABLE IF EXISTS adwest.auth_admin_users
  DROP COLUMN IF EXISTS mfa_enabled,
  DROP COLUMN IF EXISTS totp_secret;

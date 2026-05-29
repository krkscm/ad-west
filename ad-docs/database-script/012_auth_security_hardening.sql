-- ADWest PostgreSQL auth hardening migration
-- Run after 011_auth_store.sql in existing environments.

ALTER TABLE IF EXISTS adwest.auth_admin_users
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until bigint;

ALTER TABLE IF EXISTS adwest.auth_member_users
  ADD COLUMN IF NOT EXISTS password_hash varchar(255),
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until bigint;

-- Set deterministic non-production member passwords where missing.
UPDATE adwest.auth_member_users
SET password_hash = 'b2b9d869b0a15f5dd4bf22e9fdd3858a:be9301984b803c30256440ce68c78dfac2eb5577bbf9a578cd4ef19d1ded362e2b22bf9e98affcc199b9fa20a150fcad6db86f77d925d9c089748101b3dd2a23'
WHERE email = 'john.doe@email.com'
  AND (password_hash IS NULL OR password_hash = '');

UPDATE adwest.auth_member_users
SET password_hash = '960fbd59e656798050970618a7694870:e1044fbddf5552e2f4ae9417938ab3bf0f5b5a3a243178c509bf7cf599b25dcf58917f9bcda8fb00daf0ee9c20458bd7090f973508a3eaf69f4e3f601a230ec9'
WHERE email = 'priya.shah@email.com'
  AND (password_hash IS NULL OR password_hash = '');

UPDATE adwest.auth_member_users
SET password_hash = 'a2bd40ad487f014fcf542b28c0c80801:53c22895542a54a47ccfab1f354f1281b7a82f8e9228aa6036a0692e5373535aa91550893521f7073214b101b67143fb340f84e8ae24aa1b98dfefbfb3c48284'
WHERE email = 'arjun.patel@email.com'
  AND (password_hash IS NULL OR password_hash = '');

ALTER TABLE adwest.auth_member_users
  ALTER COLUMN password_hash SET NOT NULL;

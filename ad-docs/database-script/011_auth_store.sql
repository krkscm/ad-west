-- ADWest PostgreSQL auth store bootstrap
-- Run after 010_seed_minimal.sql.
-- Creates persistent auth tables used by UserManagementModule PostgresStoreService.

CREATE TABLE IF NOT EXISTS adwest.auth_admin_users (
  id varchar(64) PRIMARY KEY,
  name varchar(120) NOT NULL,
  email varchar(160) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until bigint,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at varchar(40) NOT NULL,
  updated_at varchar(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS adwest.auth_member_users (
  id varchar(64) PRIMARY KEY,
  full_name varchar(160) NOT NULL,
  email varchar(160) UNIQUE,
  phone varchar(40) UNIQUE,
  password_hash varchar(255) NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until bigint,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS adwest.auth_sessions (
  token_id varchar(80) PRIMARY KEY,
  user_id varchar(64) NOT NULL,
  type varchar(16) NOT NULL,
  expires_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS adwest.auth_otp_requests (
  id varchar(80) PRIMARY KEY,
  purpose varchar(32) NOT NULL,
  member_id varchar(64) NOT NULL,
  destination varchar(160) NOT NULL,
  code varchar(8) NOT NULL,
  expires_at bigint NOT NULL,
  attempts integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS adwest.auth_audit_logs (
  id varchar(80) PRIMARY KEY,
  actor_id varchar(64) NOT NULL,
  actor_type varchar(16) NOT NULL,
  action varchar(120) NOT NULL,
  target_type varchar(64) NOT NULL,
  target_id varchar(80) NOT NULL,
  details jsonb,
  timestamp varchar(40) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_admin_users_email ON adwest.auth_admin_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_member_users_email ON adwest.auth_member_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_member_users_phone ON adwest.auth_member_users(phone);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON adwest.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON adwest.auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_otp_requests_member_id ON adwest.auth_otp_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_auth_otp_requests_expires_at ON adwest.auth_otp_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_timestamp ON adwest.auth_audit_logs(timestamp);

-- Seed role-based admin users.
INSERT INTO adwest.auth_admin_users (
  id, name, email, password_hash, active, failed_attempts, locked_until, roles, created_at, updated_at
)
SELECT
  'admin_super_001',
  'System Super Admin',
  'super.admin@adwest.local',
  '3bb26f162ce20ec0eadb5fd56226a604:1a2c9a313224d0a12f118448e8e2af4d3754bda777fabfd0377d89ba1f7a131e10c5f3a21ac330daf2e9af95cabcf741b649fa110673f28bb32410eff95ee832',
  true,
  0,
  null,
  '[{"role":"SUPER_ADMIN","scopeType":"global"}]'::jsonb,
  now()::text,
  now()::text
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.auth_admin_users WHERE email = 'super.admin@adwest.local'
);

INSERT INTO adwest.auth_admin_users (
  id, name, email, password_hash, active, failed_attempts, locked_until, roles, created_at, updated_at
)
SELECT
  'admin_zone_001',
  'West Zone Admin',
  'zone.admin@adwest.local',
  'ecfdef2700801c6d3b7561d80e469854:dd5ef150b548765cdd07997527500c63fca11732621bab6f54d3f81d4ebbac2910d9e677cab8d7357f4ffb2e77500e0966f870c16918921155fbc942a8e43661',
  true,
  0,
  null,
  '[{"role":"ZONE_ADMIN","scopeType":"zone","scopeId":"zone_wz"}]'::jsonb,
  now()::text,
  now()::text
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.auth_admin_users WHERE email = 'zone.admin@adwest.local'
);

INSERT INTO adwest.auth_admin_users (
  id, name, email, password_hash, active, failed_attempts, locked_until, roles, created_at, updated_at
)
SELECT
  'admin_sreny_001',
  'SV Sreny Admin',
  'sreny.admin@adwest.local',
  '3878341d2e05657f1e96ccc74d01264f:a6e94d2e572a5fdaefb2ef340b807ebb90ab86c0d9c4454b24997093cd9098a66d9282d5fb82b9f3b59e1b600b71aed4d2ec913341e955df8e75bf26a0af1436',
  true,
  0,
  null,
  '[{"role":"SRENY_ADMIN","scopeType":"sreny","scopeId":"sreny_sv"}]'::jsonb,
  now()::text,
  now()::text
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.auth_admin_users WHERE email = 'sreny.admin@adwest.local'
);

-- Seed member identities for password login.
INSERT INTO adwest.auth_member_users (id, full_name, email, phone, password_hash, failed_attempts, locked_until, active)
SELECT 'member_001', 'John Doe', 'john.doe@email.com', '971500000001', 'b2b9d869b0a15f5dd4bf22e9fdd3858a:be9301984b803c30256440ce68c78dfac2eb5577bbf9a578cd4ef19d1ded362e2b22bf9e98affcc199b9fa20a150fcad6db86f77d925d9c089748101b3dd2a23', 0, null, true
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.auth_member_users WHERE email = 'john.doe@email.com'
);

INSERT INTO adwest.auth_member_users (id, full_name, email, phone, password_hash, failed_attempts, locked_until, active)
SELECT 'member_002', 'Priya Shah', 'priya.shah@email.com', '971500000002', '960fbd59e656798050970618a7694870:e1044fbddf5552e2f4ae9417938ab3bf0f5b5a3a243178c509bf7cf599b25dcf58917f9bcda8fb00daf0ee9c20458bd7090f973508a3eaf69f4e3f601a230ec9', 0, null, true
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.auth_member_users WHERE email = 'priya.shah@email.com'
);

INSERT INTO adwest.auth_member_users (id, full_name, email, phone, password_hash, failed_attempts, locked_until, active)
SELECT 'member_003', 'Arjun Patel', 'arjun.patel@email.com', '971500000003', 'a2bd40ad487f014fcf542b28c0c80801:53c22895542a54a47ccfab1f354f1281b7a82f8e9228aa6036a0692e5373535aa91550893521f7073214b101b67143fb340f84e8ae24aa1b98dfefbfb3c48284', 0, null, true
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.auth_member_users WHERE email = 'arjun.patel@email.com'
);

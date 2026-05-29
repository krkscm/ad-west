-- ADWest user login credentials
-- Adds password-backed login fields to application users and seeds the requested super-admin account.

ALTER TABLE IF EXISTS adwest.users
  ADD COLUMN IF NOT EXISTS password_hash varchar(255),
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_super_admin
  ON adwest.users (is_super_admin);

INSERT INTO adwest.users (
  code,
  name,
  phone,
  email,
  role_id,
  sthan_id,
  password_hash,
  is_super_admin,
  active,
  created_by,
  updated_by
)
SELECT
  'USR_SUPER_ADMIN_001',
  'Kiran Raj',
  NULL,
  'kiranraj.vgk@gmail.com',
  NULL,
  NULL,
  'adwest-super-admin-seed-2026:9195ba83b765099063013f8c54c305f17c607bf80ced4f8476236e1144af3d6d82d1a3b5c69dfa0acf65d11c9508cd723a93fc74c3c44109850a15a8959594d1',
  true,
  true,
  'system',
  'system'
WHERE NOT EXISTS (
  SELECT 1
  FROM adwest.users
  WHERE lower(email) = lower('kiranraj.vgk@gmail.com')
);

-- User gender for profile display (male | female)
ALTER TABLE IF EXISTS adwest.users
  ADD COLUMN IF NOT EXISTS gender text;

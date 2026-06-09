-- 077: Seva Samithi contact registry
-- Links every household primary contact to the Seva Samithi contact list without
-- using upload Excel membership columns. Sreni memberships remain on contact_sreni_tags.

CREATE TABLE IF NOT EXISTS adwest.seva_samithi_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  uuid NOT NULL REFERENCES adwest.sreni_contacts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_seva_samithi_contacts_contact UNIQUE (contact_id)
);

CREATE INDEX IF NOT EXISTS idx_seva_samithi_contacts_contact_id
  ON adwest.seva_samithi_contacts (contact_id);

-- Backfill existing household primaries from member upload / global contacts.
INSERT INTO adwest.seva_samithi_contacts (contact_id)
SELECT c.id
FROM adwest.sreni_contacts c
WHERE c.contact_kind = 'household'
ON CONFLICT (contact_id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_seva_samithi_contacts_updated_at'
      AND tgrelid = 'adwest.seva_samithi_contacts'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_seva_samithi_contacts_updated_at
      BEFORE UPDATE ON adwest.seva_samithi_contacts
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

-- 078: Seva Samithi activity / contribution tracking per registry contact.
-- Each row records a dated seva activity with free-text details and optional documents.

CREATE TABLE IF NOT EXISTS adwest.seva_samithi_contributions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     uuid NOT NULL REFERENCES adwest.sreni_contacts(id) ON DELETE CASCADE,
  activity_date  date NOT NULL,
  seva_activity  text,
  details        text,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seva_samithi_contributions_contact_date
  ON adwest.seva_samithi_contributions (contact_id, activity_date DESC);

CREATE TABLE IF NOT EXISTS adwest.seva_samithi_contribution_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id  uuid NOT NULL REFERENCES adwest.seva_samithi_contributions(id) ON DELETE CASCADE,
  file_name        text NOT NULL,
  file_type        text,
  file_path        text NOT NULL,
  file_size        bigint,
  uploaded_by      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seva_samithi_contribution_documents_contribution
  ON adwest.seva_samithi_contribution_documents (contribution_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_seva_samithi_contributions_updated_at'
      AND tgrelid = 'adwest.seva_samithi_contributions'::regclass
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_seva_samithi_contributions_updated_at
      BEFORE UPDATE ON adwest.seva_samithi_contributions
      FOR EACH ROW EXECUTE FUNCTION adwest.set_updated_at();
    $trg$;
  END IF;
END;
$$;

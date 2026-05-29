-- ADWest PostgreSQL migration: FRM-008, FRM-017, FRM-035 persistence support
-- Adds contact-sreny metadata persistence, merge propagation function,
-- and helpdesk archive-search / dashboard metrics DB primitives.

-- FRM-008: Sreny-scoped custom metadata fields on contacts
CREATE TABLE IF NOT EXISTS adwest.contact_sreny_metadata (
  contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE CASCADE,
  sreny_id uuid NOT NULL REFERENCES adwest.srenies(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, sreny_id),
  CONSTRAINT chk_contact_sreny_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_contact_sreny_metadata_contact_id
  ON adwest.contact_sreny_metadata(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_sreny_metadata_sreny_id
  ON adwest.contact_sreny_metadata(sreny_id);

CREATE INDEX IF NOT EXISTS idx_contact_sreny_metadata_gin
  ON adwest.contact_sreny_metadata USING gin (metadata jsonb_path_ops);

CREATE OR REPLACE FUNCTION adwest.enforce_contact_sreny_membership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM adwest.sreny_memberships sm
    WHERE sm.contact_id = NEW.contact_id
      AND sm.sreny_id = NEW.sreny_id
      AND sm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Contact % does not have active membership in sreny %', NEW.contact_id, NEW.sreny_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contact_sreny_metadata_updated_at'
  ) THEN
    CREATE TRIGGER trg_contact_sreny_metadata_updated_at
    BEFORE UPDATE ON adwest.contact_sreny_metadata
    FOR EACH ROW
    EXECUTE FUNCTION adwest.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contact_sreny_metadata_membership_guard'
  ) THEN
    CREATE TRIGGER trg_contact_sreny_metadata_membership_guard
    BEFORE INSERT OR UPDATE ON adwest.contact_sreny_metadata
    FOR EACH ROW
    EXECUTE FUNCTION adwest.enforce_contact_sreny_membership();
  END IF;
END;
$$;

-- FRM-017: merge propagation tracking and merge routine
CREATE TABLE IF NOT EXISTS adwest.contact_merge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id uuid REFERENCES adwest.import_batches(id) ON DELETE SET NULL,
  duplicate_candidate_id uuid REFERENCES adwest.dedup_candidates(id) ON DELETE SET NULL,
  survivor_contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE RESTRICT,
  merged_contact_id uuid NOT NULL REFERENCES adwest.contacts(id) ON DELETE RESTRICT,
  merged_by uuid REFERENCES adwest.admin_users(id) ON DELETE SET NULL,
  merged_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_contact_merge_events_distinct_contacts CHECK (survivor_contact_id <> merged_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_merge_events_survivor
  ON adwest.contact_merge_events(survivor_contact_id, merged_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_merge_events_merged
  ON adwest.contact_merge_events(merged_contact_id, merged_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_merge_events_import_batch
  ON adwest.contact_merge_events(import_batch_id);

CREATE OR REPLACE FUNCTION adwest.merge_contacts(
  p_survivor_contact_id uuid,
  p_merged_contact_id uuid,
  p_import_batch_id uuid DEFAULT NULL,
  p_duplicate_candidate_id uuid DEFAULT NULL,
  p_merged_by uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  success boolean,
  survivor_contact_id uuid,
  merged_contact_id uuid
)
LANGUAGE plpgsql
AS $$
DECLARE
  survivor_zone_id uuid;
  merged_zone_id uuid;
BEGIN
  IF p_survivor_contact_id = p_merged_contact_id THEN
    RAISE EXCEPTION 'Survivor and merged contact must be different';
  END IF;

  SELECT zone_id INTO survivor_zone_id
  FROM adwest.contacts
  WHERE id = p_survivor_contact_id
    AND status <> 'deleted';

  IF survivor_zone_id IS NULL THEN
    RAISE EXCEPTION 'Survivor contact % not found or deleted', p_survivor_contact_id;
  END IF;

  SELECT zone_id INTO merged_zone_id
  FROM adwest.contacts
  WHERE id = p_merged_contact_id
    AND status <> 'deleted';

  IF merged_zone_id IS NULL THEN
    RAISE EXCEPTION 'Merged contact % not found or deleted', p_merged_contact_id;
  END IF;

  IF survivor_zone_id <> merged_zone_id THEN
    RAISE EXCEPTION 'Contacts must be from the same zone to merge';
  END IF;

  INSERT INTO adwest.sreny_memberships (contact_id, sreny_id, joined_date, status)
  SELECT p_survivor_contact_id, sm.sreny_id, sm.joined_date, 'active'
  FROM adwest.sreny_memberships sm
  WHERE sm.contact_id = p_merged_contact_id
    AND sm.status = 'active'
  ON CONFLICT (contact_id, sreny_id) DO NOTHING;

  INSERT INTO adwest.contact_sreny_metadata (contact_id, sreny_id, metadata)
  SELECT p_survivor_contact_id, csm.sreny_id, csm.metadata
  FROM adwest.contact_sreny_metadata csm
  WHERE csm.contact_id = p_merged_contact_id
  ON CONFLICT (contact_id, sreny_id)
  DO UPDATE SET
    metadata = adwest.contact_sreny_metadata.metadata || EXCLUDED.metadata,
    updated_at = now();

  UPDATE adwest.registrations
  SET contact_id = p_survivor_contact_id,
      updated_at = now()
  WHERE contact_id = p_merged_contact_id
    AND NOT EXISTS (
      SELECT 1
      FROM adwest.registrations r2
      WHERE r2.program_id = adwest.registrations.program_id
        AND r2.contact_id = p_survivor_contact_id
    );

  DELETE FROM adwest.registrations
  WHERE contact_id = p_merged_contact_id;

  UPDATE adwest.attendance
  SET contact_id = p_survivor_contact_id,
      updated_at = now()
  WHERE contact_id = p_merged_contact_id
    AND NOT EXISTS (
      SELECT 1
      FROM adwest.attendance a2
      WHERE a2.session_id = adwest.attendance.session_id
        AND a2.contact_id = p_survivor_contact_id
    );

  DELETE FROM adwest.attendance
  WHERE contact_id = p_merged_contact_id;

  UPDATE adwest.helpdesk_tickets
  SET contact_id = p_survivor_contact_id,
      updated_at = now()
  WHERE contact_id = p_merged_contact_id;

  UPDATE adwest.edit_requests
  SET contact_id = p_survivor_contact_id,
      updated_at = now()
  WHERE contact_id = p_merged_contact_id;

  UPDATE adwest.contacts
  SET status = 'deleted',
      updated_at = now()
  WHERE id = p_merged_contact_id;

  INSERT INTO adwest.contact_merge_events (
    import_batch_id,
    duplicate_candidate_id,
    survivor_contact_id,
    merged_contact_id,
    merged_by,
    details
  ) VALUES (
    p_import_batch_id,
    p_duplicate_candidate_id,
    p_survivor_contact_id,
    p_merged_contact_id,
    p_merged_by,
    COALESCE(p_details, '{}'::jsonb)
  );

  IF p_duplicate_candidate_id IS NOT NULL THEN
    UPDATE adwest.dedup_candidates
    SET resolution = 'merged',
        reviewed_by = COALESCE(p_merged_by, reviewed_by),
        reviewed_at = now(),
        matched_contact_id = p_survivor_contact_id
    WHERE id = p_duplicate_candidate_id;
  END IF;

  RETURN QUERY SELECT true, p_survivor_contact_id, p_merged_contact_id;
END;
$$;

-- FRM-035: searchable helpdesk archive + dashboard metrics support
ALTER TABLE adwest.helpdesk_tickets
  ADD COLUMN IF NOT EXISTS search_document tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      trim(
        coalesce(subject, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(category, '')
      )
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_helpdesk_search_document_gin
  ON adwest.helpdesk_tickets USING gin (search_document);

CREATE INDEX IF NOT EXISTS idx_helpdesk_subject_trgm
  ON adwest.helpdesk_tickets USING gin (lower(subject) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_helpdesk_description_trgm
  ON adwest.helpdesk_tickets USING gin (lower(description) gin_trgm_ops);

CREATE OR REPLACE VIEW adwest.helpdesk_ticket_metrics_v1 AS
SELECT
  zone_id,
  count(*)::bigint AS total,
  count(*) FILTER (WHERE status = 'new')::bigint AS open,
  count(*) FILTER (WHERE status = 'in_progress')::bigint AS in_progress,
  count(*) FILTER (WHERE status = 'resolved')::bigint AS resolved,
  count(*) FILTER (WHERE status = 'closed')::bigint AS closed,
  jsonb_object_agg(category, category_count) AS by_category
FROM (
  SELECT
    t.zone_id,
    t.status,
    t.category,
    count(*) OVER (PARTITION BY t.zone_id, t.category) AS category_count
  FROM adwest.helpdesk_tickets t
) rows
GROUP BY zone_id;

CREATE OR REPLACE VIEW adwest.helpdesk_ticket_archive_search_v1 AS
SELECT
  t.id,
  t.zone_id,
  t.contact_id,
  t.status,
  t.priority,
  t.category,
  t.subject,
  t.description,
  t.created_at,
  t.updated_at,
  coalesce(string_agg(tc.body, ' ' ORDER BY tc.created_at), '') AS comments_text,
  (
    t.search_document ||
    to_tsvector('simple', coalesce(string_agg(tc.body, ' ' ORDER BY tc.created_at), ''))
  ) AS archive_search_document
FROM adwest.helpdesk_tickets t
LEFT JOIN adwest.ticket_comments tc ON tc.ticket_id = t.id
GROUP BY
  t.id,
  t.zone_id,
  t.contact_id,
  t.status,
  t.priority,
  t.category,
  t.subject,
  t.description,
  t.created_at,
  t.updated_at,
  t.search_document;
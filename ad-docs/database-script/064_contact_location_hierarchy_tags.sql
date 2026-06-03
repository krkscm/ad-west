-- Migration 064: Contact location hierarchy tags
-- Adds explicit location hierarchy tags on contacts so parent/child levels
-- (zone/sthan/division) can be resolved quickly without re-deriving each time.

ALTER TABLE adwest.sreni_contacts
  ADD COLUMN IF NOT EXISTS zone_location_id UUID REFERENCES adwest.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sthan_location_id UUID REFERENCES adwest.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS division_location_id UUID REFERENCES adwest.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_zone_location_id
  ON adwest.sreni_contacts(zone_location_id);

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_sthan_location_id
  ON adwest.sreni_contacts(sthan_location_id);

CREATE INDEX IF NOT EXISTS idx_sreni_contacts_division_location_id
  ON adwest.sreni_contacts(division_location_id);

-- Backfill hierarchy tags for rows that already carry a direct location_id.
-- We only walk up to two parent hops because current hierarchy depth is
-- zone -> sthan -> division.
UPDATE adwest.sreni_contacts c
SET
  zone_location_id = CASE
    WHEN l.level = 'zone' THEN l.id
    WHEN p1.level = 'zone' THEN p1.id
    WHEN p2.level = 'zone' THEN p2.id
    ELSE NULL
  END,
  sthan_location_id = CASE
    WHEN l.level = 'sthan' THEN l.id
    WHEN p1.level = 'sthan' THEN p1.id
    WHEN p2.level = 'sthan' THEN p2.id
    ELSE NULL
  END,
  division_location_id = CASE
    WHEN l.level = 'division' THEN l.id
    WHEN p1.level = 'division' THEN p1.id
    WHEN p2.level = 'division' THEN p2.id
    ELSE NULL
  END
FROM adwest.locations l
LEFT JOIN adwest.locations p1 ON p1.id::text = l.parent_id
LEFT JOIN adwest.locations p2 ON p2.id::text = p1.parent_id
WHERE c.location_id = l.id;
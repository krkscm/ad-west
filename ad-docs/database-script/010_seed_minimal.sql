-- ADWest PostgreSQL minimal seed data
-- Optional. Run after schema and indexes.

INSERT INTO adwest.zones (code, name, description, active_year)
SELECT 'WZ', 'West Zone', 'Default bootstrap zone', EXTRACT(YEAR FROM CURRENT_DATE)::int
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.zones WHERE code = 'WZ'
);

INSERT INTO adwest.contacts (
  zone_id,
  first_name,
  last_name,
  phone_primary,
  email_primary,
  status
)
SELECT z.id, 'Demo', 'Member', '971500000001', 'member@adwest.local', 'active'
FROM adwest.zones z
WHERE z.code = 'WZ'
AND NOT EXISTS (
  SELECT 1 FROM adwest.contacts c WHERE c.email_primary = 'member@adwest.local'
);

INSERT INTO adwest.sreny_memberships (contact_id, sreny_id, status)
SELECT c.id, s.id, 'active'
FROM adwest.contacts c
JOIN adwest.zones z ON z.id = c.zone_id
JOIN adwest.srenies s ON s.zone_id = z.id
WHERE c.email_primary = 'member@adwest.local'
  AND s.is_service_sreny = true
  AND NOT EXISTS (
    SELECT 1 FROM adwest.sreny_memberships m
    WHERE m.contact_id = c.id AND m.sreny_id = s.id
  );

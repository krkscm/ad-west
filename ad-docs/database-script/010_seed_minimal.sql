-- ADWest PostgreSQL minimal seed data
-- Optional. Run after schema and indexes.

INSERT INTO adwest.zones (code, name, description, active_year)
SELECT 'WZ', 'West Zone', 'Default bootstrap zone', EXTRACT(YEAR FROM CURRENT_DATE)::int
WHERE NOT EXISTS (
  SELECT 1 FROM adwest.zones WHERE code = 'WZ'
);

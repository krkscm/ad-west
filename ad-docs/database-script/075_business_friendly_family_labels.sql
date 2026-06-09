-- User-facing enum labels: replace technical "household" wording with family/Sreni business terms.
-- Enum values (HOUSEHOLD, HOUSEHOLD_HEAD, etc.) are unchanged — only display labels update.

UPDATE adwest.enum_values SET label = 'Primary family contact', updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE enum_type = 'primary_contact_strategy' AND value = 'HOUSEHOLD_HEAD';

UPDATE adwest.enum_values SET label = 'Women in the family (Mahila)', updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE enum_type = 'primary_contact_strategy' AND value = 'FEMALE_PARTICIPANTS';

UPDATE adwest.enum_values SET label = 'Enrolled children (Bala Bharathi)', updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE enum_type = 'primary_contact_strategy' AND value = 'ENROLLED_CHILDREN';

UPDATE adwest.enum_values SET label = 'Family contact — one division for the row', updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE enum_type = 'enrollment_scope' AND value = 'HOUSEHOLD';

UPDATE adwest.enum_values SET label = 'Individual member — division per enrolled person', updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE enum_type = 'enrollment_scope' AND value = 'MEMBER';

UPDATE adwest.enum_values SET label = 'Primary contact', updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
WHERE enum_type = 'household_member_role' AND value = 'head';

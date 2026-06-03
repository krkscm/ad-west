-- Migration 063: Parent value for enum_values
-- Allows a role_level (or any enum type) to declare a parent value within the same type.
-- Stored as plain text matching the 'value' column of the parent row.

ALTER TABLE adwest.enum_values
  ADD COLUMN IF NOT EXISTS parent_value VARCHAR(60) DEFAULT NULL;

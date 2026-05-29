-- Migration 026: Remove scope grants feature
-- Drops the old scope_grants table and its indexes from existing databases.

DROP TABLE IF EXISTS adwest.scope_grants CASCADE;
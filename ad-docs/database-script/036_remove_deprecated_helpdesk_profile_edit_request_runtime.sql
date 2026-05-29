-- 036_remove_deprecated_helpdesk_profile_edit_request_runtime.sql
-- Decommission deprecated helpdesk/ticket and profile-edit-request persistence.

DROP VIEW IF EXISTS adwest.helpdesk_ticket_archive_search_v1;
DROP VIEW IF EXISTS adwest.helpdesk_ticket_metrics_v1;

DROP TABLE IF EXISTS adwest.ticket_comments;
DROP TABLE IF EXISTS adwest.helpdesk_tickets;
DROP TABLE IF EXISTS adwest.edit_requests;

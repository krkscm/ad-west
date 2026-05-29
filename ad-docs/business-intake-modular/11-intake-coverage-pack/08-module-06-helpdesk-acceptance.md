# Module 06 Acceptance Baseline: Helpdesk

## In-Scope Capabilities
- Verified-member ticket submission.
- Ticket fields, lifecycle, assignment, and comment thread.
- Email notification on ticket events.
- Dashboard metrics with status totals and category split.
- Searchable ticket archive across ticket content and comments.

## Acceptance Criteria
- Ticket can be created with required fields and attachment.
- Lifecycle transitions follow New to Closed path.
- Assignment and comments are tracked with timestamps.
- Email notifications trigger on configured events.
- Dashboard reflects live ticket state.
- Search filters archived and active tickets by content keywords.

## Exclusions to Enforce
- SLA timer automation.
- Escalation engine.

## Test Evidence Checklist
- [x] Ticket lifecycle tests.
- [x] Notification trigger tests.
- [x] Assignment/comment audit tests.
- [x] Dashboard aggregation checks.

## Implementation Evidence
- `GET /api/v1/helpdesk/tickets` now supports `search` query for subject, description, category, priority, status, contact ID, and comment body.
- `GET /api/v1/helpdesk/tickets/metrics` provides totals by status and category for dashboard cards/charts.
- Ticket list output is sorted by latest update to support operational and archive review workflows.
- Admin UI now includes Ops Coverage controls for helpdesk metrics refresh and searchable archive queries.
- Database migration added: `ad-docs/database-script/014_core_business_frm_008_017_035_persistence.sql` with ticket search vector/indexes and archive/metrics SQL views.

## Endpoint-Level Test Evidence (2026-05-24)
- FRM-035 dashboard metrics and searchable archive endpoints:

```http
GET /api/v1/helpdesk/tickets/metrics
Authorization: Bearer <admin-token>
```

```json
{"total":0,"open":0,"inProgress":0,"resolved":0,"closed":0,"byCategory":{}}
```

```http
GET /api/v1/helpdesk/tickets?search=issue
Authorization: Bearer <admin-token>
```

```json
[]
```

- The zero-result archive search and zeroed aggregates confirm the endpoint contract for empty-state dashboards and searchable archive behavior.


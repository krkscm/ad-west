# Module 11 Acceptance Baseline: Approval Workflow Engine

## In-Scope Capabilities
- Configurable approval workflow definitions with ordered steps.
- Submission of approval items against workflow definitions.
- Review operation with per-step advancement and terminal approved/rejected outcome.
- Workflow modes supported: single, sequential, and parallel-any.
- Timeout-based escalation with in-app notification events and audit trail records.

## Acceptance Criteria
- Admin can define workflow for supported target types.
- Admin can submit approval item linked to workflow and target entity.
- Review action advances step index until terminal approval, or rejects immediately.
- Approval item state includes reviewer identity, timestamp, and note.

## Test Evidence Checklist
- [x] Workflow create/list API evidence.
- [x] Approval item submit/list API evidence.
- [x] Approval review progression API evidence.
- [x] Parallel-any approval mode evidence.
- [x] Escalation timeout and in-app notification evidence.

## Implementation Evidence
- API routes added under `/api/v1/approvals/*`.
- Core service logic added for workflow and approval item progression.
- Database migration added: `ad-docs/database-script/015_document_job_approval_modules.sql`.
- Frontend API client methods added in `ad-west-web/src/utils/backendApi.ts` for approval workflow endpoints.
- Admin UI operations added in `ad-west-web/src/pages/AdminDashboardPage.tsx` (Ops Coverage tab) to create workflow, submit item, and review item.
- Workflow mode and escalation fields added in `ad-west-api/src/modules/core-business/dto/core-business.dto.ts`.
- Approval audit trail and in-app notification records implemented in `ad-west-api/src/modules/core-business/core-business.service.ts`.
- Notification retrieval endpoint added: `/api/v1/approvals/notifications`.


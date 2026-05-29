# Module 09 Acceptance Baseline: Document and Report Management

## In-Scope Capabilities
- Sreny-scoped folder hierarchy for document storage.
- Document records with category, access level, linked entity metadata, and version lineage.
- Report template definition with dynamic field metadata.
- Report submission lifecycle with admin review (approve/reject with note).
- Report submission routed to approval-line actions based on the requester's Reporting To role configuration.

## Acceptance Criteria
- Admin can create folder tree per Sreny.
- Admin can create a document and add a new version linked to source document.
- Report templates support configured field definitions and required flags.
- Members can submit reports from a template.
- Admin can review report submissions and produce final status.
- Approval decisions support `Approved`, `Rejected`, and `Need More Information`.
- `Need More Information` routes back to requester; requester can resubmit and restart approval flow.
- Approval lines are visible in the dashboard `Actions` menu and in the notification popover.
- Notification popover shows highlighted unread count for in-app approval notifications.

## Report Configuration UX Reference Pattern
- Configuration pages expose create/edit/delete actions from the primary list/detail context.
- Required fields are clearly marked and validated inline before save.
- Validation errors are specific per field and guide corrective action.
- Success/error feedback appears immediately after user actions.
- On recoverable error, entered values are retained so the user can retry.
- Unsaved-change warning is shown before discarding form edits.

## Test Evidence Checklist
- [x] Folder and document create/version API evidence.
- [x] Report template and submission API evidence.
- [x] Report review (approve/reject) API evidence.
- [ ] Report approval line assignment to Reporting To users.
- [ ] Need More Information report resubmission flow.
- [ ] Actions menu + notification unread count behavior.

## Implementation Evidence
- API routes added under `/api/v1/documents/*` and `/api/v1/reports/*`.
- Core service logic added for folder/document versioning and report workflows.
- Database migration added: `ad-docs/database-script/015_document_job_approval_modules.sql`.
- Frontend API client methods added in `ad-west-web/src/utils/backendApi.ts` for documents/reports endpoints.
- Admin UI operations added in `ad-west-web/src/pages/AdminDashboardPage.tsx` (Ops Coverage tab).
- Member report submission UI added in `ad-west-web/src/pages/MemberPortalPage.tsx`.
- Sreni report runtime logic is extracted into a dedicated backend domain service to reduce monolithic Core Business service complexity.
- Document and report-template/submission runtime logic is extracted into a dedicated backend domain service (`document-report-runtime.service.ts`) with Core Business as orchestrator.

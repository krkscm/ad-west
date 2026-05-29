# Module 05 Acceptance Baseline: Attendance

## In-Scope Capabilities
- Session-level attendance marking.
- Attendance statuses: Present, Absent, Late, Excused.
- CSV bulk attendance upload.
- Per-program and per-member attendance reports.
- CSV and Excel export.
- Calendar-linked attendance listing per Sreni with scope-aware visibility.
- Attendance metric definitions with fully customizable key sets per Sreni.
- Per-event attendance value capture persisted by metric keys.
- Attendance configuration UX aligned with report configuration patterns for admin users.

## Acceptance Criteria
- Attendance can be recorded manually per session.
- CSV import correctly maps and validates attendance inputs.
- Reports can be filtered by program and member.
- Export files reflect the same report totals.
- Users can define, edit, and delete attendance metric definitions with custom keys.
- Attendance configuration flows (create/edit/delete metrics and key mapping) follow the same user-friendly interaction model used in report configuration.
- Attendance configuration surfaces validation and success/error feedback with clarity comparable to report configuration screens.
- Attendance listing follows calendar visibility rules (zone override and multi-sthan visibility).
- Attendance listing includes only events whose approval flow is completed as Approved (legacy events with no approval record remain visible).
- Attendance capture values are stored and can be updated for each event/metric pair.
- Attendance capture enforces metric-key validation and uses the active metric set configured for the same Sreni.

## UI Behavior Checkpoints (Parity with Report Configuration)
- Create metric action is discoverable from the primary attendance configuration view without hidden navigation.
- Edit and delete actions are available from the same list/detail context used for report configuration records.
- Required fields are visibly marked before submit and show inline validation messages on invalid input.
- Save is blocked on invalid input with field-level guidance; no generic-only error responses.
- Success feedback is shown immediately after create/update/delete and reflects the updated configuration state.
- Error feedback preserves user-entered values so users can correct and retry without re-entry.
- Unsaved-change protection warns users before closing or navigating away from modified forms.
- Equivalent tasks (create, edit, delete, key mapping) require no more user steps than report configuration tasks.
- Key mapping uses clear labels and helper text so non-technical users can configure metrics without schema knowledge.

## Exclusions to Enforce
- QR-based attendance check-in.

## Test Evidence Checklist
- [ ] Manual attendance evidence.
- [ ] Bulk upload validation evidence.
- [ ] Report correctness evidence.
- [ ] Export parity checks.
- [ ] UX parity evidence showing attendance configuration uses report-configuration interaction patterns.
- [ ] Validation and error-state evidence for attendance configuration screens.
- [ ] Create/edit/delete flow walkthrough with step count comparison against report configuration.
- [ ] Inline field-validation screenshots or recordings for required and invalid values.
- [ ] Save-success and recoverable-error evidence showing user input is preserved.
- [ ] Unsaved-change warning evidence during navigation/close actions.

## Implementation Evidence (2026-05-29)
- Attendance settings UI now includes inline validation for required Sreni, metric name, and metric keys.
- Unsaved-change protection is implemented for close, cancel, and edit/new transitions in attendance metric forms.
- Attendance metric keys now use a structured add/remove list editor (not a single comma-separated input), with duplicate/pending-key validation.
- Save/create/update flows preserve user-entered values on recoverable API errors.
- Attendance configuration now follows report-configuration interaction patterns (Sreni selector panel, inline add/edit form, empty state, and action table) without introducing monthly/half-year/year segregation.
- Backend attendance metric PATCH now resolves metric state from DB and returns a proper not-found error instead of 500 when metric id is missing/stale.
- Frontend implementation updated in `ad-west-web/src/pages/settings/AttendanceMetricsPage.tsx`.
- Attendance listing/capture now gates event availability by approval completion and only allows capture for approved events.
- Attendance listing/capture runtime is extracted into a dedicated backend domain service to avoid monolithic Core Business method growth.

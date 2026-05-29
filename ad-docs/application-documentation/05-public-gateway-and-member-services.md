# 05 - Public Gateway and Member Services

## Public Gateway Surface

### Helpdesk
- Public ticket submission route
- Internal admin management routes for triage/status updates

### Jobs
- Public active job listing
- Public application submission with optional resume upload
- Internal admin posting/application management routes

Resume constraints implemented in UI/backend flow:
- Allowed extensions: PDF, DOC, DOCX
- File size cap: 1 MB

### Event Registration
- Public event registration page with dynamic form-field rendering
- Public registration submission endpoint

## Member Services Surface

Member services module includes operations around:
- Reimbursements
- Special events administration
- Notifications administration

Admin workspace member-services section includes:
- Reimbursements page
- Special Events page
- Notifications page
- Gmail Workspace panel (compose + inbox preview)

## Access Model

- Public routes are intentionally open for intake use cases.
- Internal operational endpoints remain authenticated and role-scoped.
- Gmail workspace functionality additionally requires Google-authenticated admin session context.

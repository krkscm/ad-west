# 03 - Frontend Architecture

## Frontend Stack

- React + TypeScript
- Vite build and dev server
- SCSS-driven shared styling and theme tokens

## App Shell and Route Resolution

- Entry point: `src/main.tsx`
- Root route switch and auth/public branching: `src/App.tsx`

The app uses path-based conditional rendering (no external router package in the root flow):
- Public routes: `/`, `/portal`, `/helpdesk`, `/jobs`, `/jobs/apply`, `/jobs/post`, `/join-us`, `/events/:id/register`, `/forgot-password`, `/reset-password`
- Auth route: `/login`
- Authenticated workspaces: admin dashboard or member portal

`AuthProvider` gates workspace rendering until session restoration completes, preventing route flicker during startup.
The `/login` route also defers rendering the sign-in page until initialization completes, so authenticated refreshes show the bootstrap loader instead of a transient login flash.

## Primary Frontend Surfaces

### Public Surface

- Portal landing (`PublicPortalPage`)
- Public helpdesk intake
- Public jobs listing/apply/post
- Public event registration
- Public join-us contact registration

### Admin Surface

- Admin dashboard and module tabs
- Governance pages (including insights, approvals, responsibility chart, AI chatbot)
- Core business operations (Sreni/Sthan/reporting/attendance)
- Helpdesk admin operations
- Member services admin operations
- Settings pages (Google integration, SMTP/IMAP integration, report config, layout/settings)

### Member Surface

- Member portal workspace
- Member-authenticated feature access based on token/session context

## API Integration Model

Frontend API integration is layered:

1. `src/utils/api.ts`
	- Base URL defaults to `/api/v1`
	- Enforces relative endpoint normalization
	- Adds request timeout via `AbortController`
	- Centralizes response and error parsing

2. `src/utils/backendApi.ts`
	- Domain-specific wrappers for auth, gateway, member services, core business, settings, and analytics operations
	- Form-data upload wrappers for public job application flows

## Context and Provider Layer

App-level providers:
- `ToastProvider`
- `ConfirmDialogProvider`
- `ThemeProvider`
- `AuthProvider`

These providers establish shared UX behaviors and session-aware access patterns across admin, member, and public screens.

## UI Architecture Notes

- Public pages intentionally use a separate visual language from admin/member workspace.
- Shared field and date-time components are reused across operational forms.
- Dashboard and analytics pages prioritize role/menu-aware visibility and reusable control panels.
- The frontend honors backend-driven menu grants for governance and settings navigation.
- Governance and Member Services are presented under a shared sidebar parent group (`General Services`) in the admin workspace while child visibility remains grant-driven.
- Analytics Studio Detailed Reports now includes Table Customization using persisted per-user table layouts via the shared table-layout modal pattern.
- In Sreni contact assignment flows, the Division selector is conditionally rendered and is hidden when no division records are available.

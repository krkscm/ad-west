# 03 - Frontend Architecture

## Frontend Stack

- React + TypeScript
- Vite dev/build tooling
- Global styling with SCSS (`src/styles/index.scss`)

## App Entry and Routing

- Entry: `ad-west-web/src/main.tsx`
- Root switch logic: `ad-west-web/src/App.tsx`

Routing is URL-path based in app code:
- Admin-authenticated flow
- Member-authenticated flow
- Public route flow (`/`, `/portal`, `/helpdesk`, `/jobs`, `/jobs/apply`, `/jobs/post`, `/events/:id/register`, `/join-us`)

## Core Frontend Contexts

- `AuthProvider`: token/session/user state, including startup restoration gating so authenticated routes do not briefly fall through to the login screen during refresh.
- The auth bootstrap gate now uses a branded full-screen loader shell instead of plain text so refresh-state transitions stay visually consistent with the admin theme.

## Main Application Pages

### Authenticated
- Admin dashboard shell with role/menu-aware tab rendering
- Admin Insights page (`src/pages/InsightsPage.tsx`) with cross-module analytics charts and event summary table
- Settings pages including Responsibility Chart, Google Integration, Email Integration (SMTP/IMAP), and Report Config
- Forgot Password page (`/forgot-password`) and Reset Password page (`/reset-password?token=`) — public routes, no auth required
- Sthan management detail pages (`SthanDetailPage`) with nested Reports, Expenses, and Contacts tabs
- Helpdesk admin pages: tickets, job postings, job applications
- Member Services admin pages: reimbursements, special events, notifications, Email Workspace (compose + IMAP inbox, no Google OAuth required)
- Per-Sreni `Analytics Studio` page (`src/pages/SreniAnalyticsStudioPage.tsx`) with tabbed Detailed Reports, Pivot Studio, and Graph Studio across contacts, events, and attendance domains, including expanded chart types (line, bar, area, composed, pie, radar)
- Analytics Studio interaction controls are aligned with shared admin UI patterns (switch-toggle for binary controls and button-based selectors for multi-select option sets)
- Member portal
- Forced password change page

### Public
- Public portal landing page at `/` and `/portal` with a branded hero, service cards for Helpdesk/Careers/Join Us, and a login shortcut for authenticated access
- Public helpdesk page
- Public jobs page (listings, apply, post)
- Public event registration page
- Public "Join Us" contact registration page that captures lead/contact details per selected Sreni, grouped into clearly labeled membership, contact, profile, residence, and security sections
- Sreni Definition CRUD includes a dedicated Join Us visibility toggle; only enabled Srenis are shown in the public Join Us dropdown

## Frontend API Integration

`ad-west-web/src/utils/backendApi.ts` centralizes HTTP operations and endpoint wrappers, including:
- Auth and protected APIs
- Public gateway APIs
- Google integration settings APIs
- SMTP/IMAP email integration settings APIs
- Email inbox/send APIs (SMTP/IMAP-backed, no Google OAuth required)
- Member services and helpdesk admin APIs
- Public Sreni contact intake wrappers (`publicListSreniContactOptions`, `publicRegisterSreniContact`) and captcha challenge utility reuse

HTTP execution behavior in `src/utils/api.ts` now includes endpoint normalization checks (rejects absolute URLs), per-request timeout via `AbortController`, and unified response parsing for consistency.

## UI Architecture Notes

- Shared utility classes and theme variables live in global SCSS.
- Public-facing routes use a dedicated warm palette in `src/styles/index.scss` (`--public-*` tokens), centered on saffron/ivory surfaces with green support accents so the landing, helpdesk, jobs, join-us, and event-registration pages stay visually distinct from the admin/member workspace theme.
- Shared date/time entry controls are centralized via `src/components/common/DateFields.tsx` to keep placeholders and picker interactions consistent across modules.
- Notification authoring and similar admin forms use wider responsive DateTimePicker layout blocks to preserve full date/time placeholder readability without icon overlap.
- Date/time composite controls (`DateTimePicker` and `DateRangePicker`) include explicit mobile breakpoints that stack fields to one column, and notification form actions also stack for small-screen usability.
- Public pages use shared responsive hooks plus page-specific styles.
- Admin dashboard now supports very-small-device drawer-like navigation behavior.
- Admin dashboard tab routing includes integrated navigation to Insights and Responsibility Chart flows.
- Sidebar navigation groups Insights, My Approvals, AI Chatbot, and Responsibility Chart under a dedicated Governance parent menu.
- Governance menu visibility is grant-driven from backend menu definitions, so admin menu assignments directly control access to Insights, My Approvals, AI Chatbot, and Responsibility Chart.
- Admin control screens (Menu Structure and Admin Menu Access assignment) request the full menu catalog via `scope=all`, while runtime sidebar loading remains grant-filtered.
- Session hydration preserves token-level SUPER_ADMIN identity (especially core `users` admin sessions) even when profile enrichment data comes from `admin_users`, preventing false loss of super-admin-only navigation visibility.
- Role normalization in session/tab access checks now tolerates common role-string variants (spaces, dashes, underscore differences) so super-admin navigation visibility remains stable.
- Insights now starts directly with analytics charts/tables; top KPI strip was removed.
- Insights contact totals are derived from per-Sreni contact APIs so the page stays aligned with the current backend route model instead of calling a removed global contacts endpoint.
- The three-column Sreni insights row keeps equal-height cards, and the chart/empty-state bodies stretch within those cards so sparse widgets do not leave fixed-height content floating in excess space.
- Insights target achievement always renders per-Sreni rows: it falls back to submission-completion achievement when no metric targets exist, and switches to actual-vs-target achievement per Sreni once numeric monthly targets are configured.
- Dynamic Sreni child menu routing now includes `sreni-<id>-analytics` for advanced Sreni-level performance analysis.
- Sthan report submission consumes location-scoped report metrics from Report Config (`scope=location`) so all sthans share one metric definition set.
- Insights calculations include memoized aggregation paths and robust numeric parsing for better large-data performance and reporting accuracy.
- Insights includes a date filter panel with preset ranges (last 1 month, 3 months, 6 months, and 1 year) plus a Custom option where users choose From/To dates; selected ranges are passed as `fromDate`/`toDate` query params to the Insights data APIs.
- Dashboard and Insights are now centered on three governance pillars across both Sreni and Sthan units: Contacts, Attendance, and Reporting, with per-unit comparative visualizations.
- Governance includes an AI Chatbot page that accepts prompts plus optional context and returns AI-generated insight responses from authenticated backend AI provider integration.
- Responsibility Chart now renders as a true interactive org chart graph (top-down reporting flow) where each node displays person name, role, sthan, contact number, and reporting line.
- The app-shell CSP kept in `index.html` avoids directives like `frame-ancestors` that browsers ignore when delivered via a meta tag; those must be set as HTTP headers if enforced later.
- Google OAuth popup message origin check (`AuthContext.tsx`) accepts both `window.location.origin` (frontend) and `VITE_API_PROXY_TARGET` origin (API) to support localhost dev environments where the frontend (port 3000) and API (port 3001) run on different ports.
- Notification/date-time controls include explicit component-level responsive breakpoints so layout remains readable across mobile/tablet widths.

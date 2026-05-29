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
- Public route flow (`/helpdesk`, `/jobs`, `/jobs/apply`, `/jobs/post`, `/events/:id/register`)

## Core Frontend Contexts

- `AuthProvider`: token/session/user state, including startup restoration gating so authenticated routes do not briefly fall through to the login screen during refresh.
- The auth bootstrap gate now uses a branded full-screen loader shell instead of plain text so refresh-state transitions stay visually consistent with the admin theme.

## Main Application Pages

### Authenticated
- Admin dashboard shell with role/menu-aware tab rendering
- Admin Insights page (`src/pages/InsightsPage.tsx`) with cross-module analytics charts and event summary table
- Settings pages including Responsibility Chart, Google Integration, and Report Config
- Helpdesk admin pages: tickets, job postings, job applications
- Member Services admin pages: reimbursements, special events, notifications, Gmail workspace
- Per-Sreni `Analytics Studio` page (`src/pages/SreniAnalyticsStudioPage.tsx`) with tabbed Detailed Reports, Pivot Studio, and Graph Studio across contacts, events, and attendance domains, including expanded chart types (line, bar, area, composed, pie, radar)
- Analytics Studio interaction controls are aligned with shared admin UI patterns (switch-toggle for binary controls and button-based selectors for multi-select option sets)
- Member portal
- Forced password change page

### Public
- Public helpdesk page
- Public jobs page (listings, apply, post)
- Public event registration page

## Frontend API Integration

`ad-west-web/src/utils/backendApi.ts` centralizes HTTP operations and endpoint wrappers, including:
- Auth and protected APIs
- Public gateway APIs
- Google integration settings APIs
- Gmail inbox/send APIs
- Member services and helpdesk admin APIs

HTTP execution behavior in `src/utils/api.ts` now includes endpoint normalization checks (rejects absolute URLs), per-request timeout via `AbortController`, and unified response parsing for consistency.

## UI Architecture Notes

- Shared utility classes and theme variables live in global SCSS.
- Shared date/time entry controls are centralized via `src/components/common/DateFields.tsx` to keep placeholders and picker interactions consistent across modules.
- Notification authoring and similar admin forms use wider responsive DateTimePicker layout blocks to preserve full date/time placeholder readability without icon overlap.
- Date/time composite controls (`DateTimePicker` and `DateRangePicker`) include explicit mobile breakpoints that stack fields to one column, and notification form actions also stack for small-screen usability.
- Public pages use shared responsive hooks plus page-specific styles.
- Admin dashboard now supports very-small-device drawer-like navigation behavior.
- Admin dashboard tab routing includes integrated navigation to Insights and Responsibility Chart flows.
- Insights now starts directly with analytics charts/tables; top KPI strip was removed.
- Insights contact totals are derived from per-Sreni contact APIs so the page stays aligned with the current backend route model instead of calling a removed global contacts endpoint.
- The three-column Sreni insights row keeps equal-height cards, and the chart/empty-state bodies stretch within those cards so sparse widgets do not leave fixed-height content floating in excess space.
- Insights target achievement always renders per-Sreni rows: it falls back to submission-completion achievement when no metric targets exist, and switches to actual-vs-target achievement per Sreni once numeric monthly targets are configured.
- Dynamic Sreni child menu routing now includes `sreni-<id>-analytics` for advanced Sreni-level performance analysis.
- Insights calculations include memoized aggregation paths and robust numeric parsing for better large-data performance and reporting accuracy.
- The app-shell CSP kept in `index.html` avoids directives like `frame-ancestors` that browsers ignore when delivered via a meta tag; those must be set as HTTP headers if enforced later.
- Notification/date-time controls include explicit component-level responsive breakpoints so layout remains readable across mobile/tablet widths.

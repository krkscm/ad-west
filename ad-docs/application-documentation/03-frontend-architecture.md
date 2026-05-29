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

- `AuthProvider`: token/session/user state
- `ThemeProvider`: theme state
- `ToastProvider`: UI notifications
- `ConfirmDialogProvider`: confirmation modal workflow

## Main Application Pages

### Authenticated
- Admin dashboard shell with role/menu-aware tab rendering
- Admin Insights page (`src/pages/InsightsPage.tsx`) with cross-module analytics charts and event summary table
- Settings pages including Responsibility Chart, Google Integration, and Report Config
- Helpdesk admin pages: tickets, job postings, job applications
- Member Services admin pages: reimbursements, special events, notifications, Gmail workspace
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

## UI Architecture Notes

- Shared utility classes and theme variables live in global SCSS.
- Public pages use shared responsive hooks plus page-specific styles.
- Admin dashboard now supports very-small-device drawer-like navigation behavior.
- Admin dashboard tab routing includes integrated navigation to Insights and Responsibility Chart flows.
- Insights now starts directly with analytics charts/tables; top KPI strip was removed.

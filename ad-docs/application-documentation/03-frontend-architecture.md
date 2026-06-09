# 03 - Frontend Architecture

## Stack

- React 18 + TypeScript
- Vite dev server and production build
- SCSS with shared theme tokens (`src/styles/`)
- No React Router package — path-based rendering with custom history helpers (`appNavigation.ts`, `adminNavigation.ts`)

## Entry and providers

| File | Role |
|------|------|
| `src/main.tsx` | DOM mount |
| `src/App.tsx` | Public vs authenticated workspace switch |
| `AuthProvider` | Session restore, workspace routing |
| `admin-definitions-context.tsx` | Cached zones, Srenis, sthans, locations for forms |
| `ToastProvider`, `ConfirmDialogProvider`, `ThemeProvider` | Shared UX |

Public routes render **without** waiting for auth initialization. `/login` and authenticated workspaces wait for session restore to avoid login flash.

## Route map

### Public routes (`App.tsx`)

| Path | Page |
|------|------|
| `/`, `/portal` | `PublicPortalPage` |
| `/helpdesk` | `PublicHelpdeskPage` |
| `/join-us` | `PublicContactRegistrationPage` |
| `/jobs`, `/jobs/apply`, `/jobs/post` | `PublicJobsPage` |
| `/events/:id/register` | `PublicEventRegistrationPage` |
| `/forgot-password`, `/reset-password` | Password recovery |
| `/login` | `AdminLoginPage` |

### Admin workspace (`AdminDashboardPage.tsx`)

Path → tab mapping in `adminNavigation.ts`. Major static paths:

**General Services** (parent key `governance`):

| Path | Tab / page |
|------|------------|
| `/admin/general-services/insights` | Insights |
| `/admin/general-services/approvals` | My approvals |
| `/admin/general-services/contacts` | `GlobalContactsPage` |
| `/admin/general-services/join-us-review` | `JoinUsReviewPage` |
| `/admin/general-services/responsibility-chart` | Responsibility chart |
| `/admin/general-services/reimbursements` | Reimbursements admin |
| `/admin/general-services/events` | Special events |
| `/admin/general-services/notifications` | Notifications |
| `/admin/general-services/gmail` | Email workspace |

**Helpdesk:** `/admin/helpdesk/tickets`, `/jobs`, `/applications`

**Settings:** `/admin/settings/*` — roles, locations, Sreni definitions, permissions, permission sets, users, admins, approval workflows, attendance metrics, report config, Google, email, reference data

**Dynamic Sreni:** `/admin/sreni/{slug}/{calendar|contacts|attendance|documents|reports|analytics}`

**Dynamic Sthan:** `/admin/sthan/{slug}/{calendar|reports|expenses|contacts}`

Legacy paths redirect (e.g. `/admin/contacts` → general-services contacts; `/admin/ai-chatbot` → insights).

### Member workspace

`MemberPortalPage` — reimbursements, events, notifications for member token holders.

## Key feature pages

### Contact governance

| Page | Features |
|------|----------|
| `GlobalContactsPage` | Paginated global list, upload modal, sreni tags, edit, active toggle |
| `SreniContactListPage` | Per-Sreni list, columns layout, division/sthan assign, family members, upload |
| `SthanContactsPage` | Sthan-scoped contacts |
| `JoinUsReviewPage` | Pending public registrations, complete review |

### Sreni contact list (2026 additions)

When Sreni name matches Seva Samithi:

- **Member Srenis** column from `contact_sreni_tags`
- **Seva activity** row action → modal with date, activity text, details, multi-document upload/download
- Upload uses member data template (not per-Sreni Yes/No columns for SS)

When `gada_assignment_enabled` on Sreni:

- Gada filter pills (All / Unassigned / Mine)
- Assign Gada modal, Manage Gadanayaks modal

### Upload flow

| Component | Role |
|-----------|------|
| `ContactUploadModal` | File pick, calls preview API |
| `ContactUploadReviewModal` | Row-level insert/update/skip decisions, commit |
| `ContactEditModal` | Inline field sections from column metadata |

Used from `GlobalContactsPage` and `SreniContactListPage`. Template: `public/templates/Member_Data_Upload_Template.xlsx` (also served by API).

### Settings

| Page | Notes |
|------|-------|
| `SreniDefinitionPage` | Join Us visibility, show in upload Excel, gada toggle |
| `UsersFormPage` | Role, sthan, permission set, super-admin |
| `PermissionSetsPage` / `PermissionDefinitionsPage` | Data access bundles |
| `LocationDefinitionPage` | Hierarchy via `parentId` and role_level enums |

## API integration

1. **`src/utils/api.ts`** — fetch wrapper, `/api/v1` base, timeout, blob/form helpers
2. **`src/utils/backendApi.ts`** — typed domain methods (contacts, gada, seva contributions, upload, join-us, etc.)

Vite proxies `/api/v1` → `VITE_API_PROXY_TARGET` (default `http://127.0.0.1:3001`).

### Notable client methods (contacts)

- `previewMemberContactUpload`, `commitMemberContactUpload`, `downloadMemberContactTemplate`
- `listSreniContacts` with `gadaFilter` / `gadanayakUserId`
- `listSevaContributions`, `createSevaContribution`, `uploadSevaContributionDocuments`, `downloadSevaContributionDocument`
- `listJoinUsSubmissions`, `completeJoinUsReview`

## Shared UI patterns

- `PageHeader` + `PaginationBar` on list pages
- `TableLayoutModal` + `useTableLayout` for per-user column visibility
- `TableRowActionsMenu` for row actions
- `DateField` / `TimeField` for date-time inputs
- Business-friendly labels from enum metadata (migration 075)

## Navigation and visibility

- Sidebar built from menu grants for non-super-admin admins
- Super admins see full menu
- `InternalLinkInterceptor` handles in-app admin links
- Approval Workflows settings tab may be hidden by feature flag in `AdminDashboardPage`

## Diagram

- [frontend-governance-contacts-flow.md](./diagrams/frontend-governance-contacts-flow.md)

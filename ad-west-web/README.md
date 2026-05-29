# AD West Web

React frontend application for AD West.

## Project Structure

```
src/
├── components/
│   ├── common/      # Shared UI components (Button, Card, Modal, etc.)
│   └── features/    # Feature-specific components
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── context/         # React Context for state management
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── styles/          # Global styles
```

## Styling Standard

- SCSS is the required stylesheet format for this project.
- New stylesheets must be created as `.scss` files (not `.css`).
- Form-level `Active/Inactive` inputs must use the shared switch-toggle control (not checkbox/select/segmented buttons), to keep status controls visually consistent across settings pages.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the development server at `http://localhost:3000`

### Local API Wiring

- Frontend defaults to `VITE_API_URL=/api/v1`.
- Vite dev server proxies `/api/v1/*` requests to `VITE_API_PROXY_TARGET`.
- Default proxy target is `http://localhost:3002`.

If your backend runs on a different port, set `VITE_API_PROXY_TARGET` before starting dev.

## Unified Access Flow

- Users now enter the application directly through a single sign-in entry point.
- After authentication, the app resolves workspace access from user credentials and profile details.
- Admin and member sign-in are password-based and protected with captcha challenges.
- Brute-force protection is enforced by backend account lockout rules.
- The app unlocks the correct workspace features after identity and permission checks.
- Role and permission boundaries are still enforced in feature views.
- Admin sign-in is code-based now, and Administrator CRUD uses admin code, admin name, active status, and a linked role definition instead of the old profile/scope fields.
- Super Admins implicitly receive all menu rights; other admins remain managed through admin menu-grant operations in the Admin Management page.
- Administrator status is presented as an on/off toggle in the form instead of a dropdown.
- The role definition selector stays inside the main account card so the admin form reads as one unified block.
- Application users now own login credentials: the user form requires a password on create, allows password reset on edit, and can mark a user as super admin for workspace access.
- `Permission Sets` is exposed as a dedicated settings page, while `Users` follows an Administrator-style flow under Settings with a separate list page and a separate create/update form page.
- `Approval Workflows` follows the same pattern as Administrator CRUD under `Settings`: a list page plus a separate create/update form page; it uses `approval_mode` values from enum values with permission-set-based hierarchy mapping (org-chart style parent stage links).
- `Attendance Metrics` under `Settings` now follows the same admin visual pattern as other settings pages (header action, collapsible form panel, unified filter toolbar, and table surface).
- Approval workflow stage design now uses a visual node canvas (drag nodes, connect parent-child edges, mini-map, zoom controls, auto-layout) while staying compatible with existing stage fields.
- Approval workflow stages are now authored against Role Definitions (multi-select per stage) so approval design is role-driven instead of person-driven.
- Approval Workflows list now includes a Coverage check action that validates whether each stage has enough eligible role-based approvers.
- Runtime APIs are available for submitting and reviewing workflow items with stage-level quorum enforcement, enabling end-to-end validation of designed flows.
- The sign-in page uses a premium hero layout with a glassmorphic form shell, supportive copy, and subtle motion.
- The current presentation uses a centered premium sign-in card with a subtle gradient shell and concise supporting copy.
- The login background now uses the user-selected image asset at `public/login-bg.jpg`.
- The login card styling is tuned to the background art with warm glass gradients, softer field surfaces, and a stronger primary action button.
- The login card header badges were removed to keep the sign-in panel minimal and neutral.
- Form placeholders use generic sample names/emails (no personal identifiers).
- The theme switch is shown only after authentication; it is hidden on the login page.
- On authenticated pages, it is placed in the page header as an icon-only action.
- The admin workspace now includes a persistent authenticated footer aligned to the main content pane, so it does not overlap the left sidebar.

For test credentials, see [ad-west-api/README.md](../ad-west-api/README.md) under Authentication Seeds (Non-Production).

### Build

```bash
npm run build
```

Builds the project for production.

### Preview

```bash
npm run preview
```

Preview the production build locally.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Best Practices

- Keep components small and focused on a single responsibility
- Use hooks for component logic
- Organize styles with CSS modules or CSS-in-JS
- Use TypeScript for type safety
- Keep API calls in a separate utility layer
- Use context for global state management when needed

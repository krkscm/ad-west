# Frontend Implementation Pattern Guide

## Purpose
Lock frontend implementation to the approved visual and interaction baseline while integrating real APIs.

## Mandatory Principle
The existing UI design is the source of truth. Implementation work must preserve established layout language, spacing rhythm, typography scale, color tokens, and interaction behavior.

## Current Design Baseline Sources
- ad-west-web/src/styles/index.css
- ad-west-web/src/pages/LandingPage.tsx
- ad-west-web/src/pages/AdminLoginPage.tsx
- ad-west-web/src/pages/AdminDashboardPage.tsx
- ad-west-web/src/pages/MemberPortalPage.tsx
- ad-west-web/src/components/common
- ad-west-web/src/components/features

## Required Implementation Pattern

### 1. Component Layering
- Keep shell-level composition in page components under `src/pages`.
- Keep reusable UI primitives and shared widgets in `src/components/common`.
- Keep feature-specific compositions in `src/components/features`.
- Move business logic into hooks and context; avoid large logic blocks in JSX.

### 2. Styling and Token Usage
- Reuse existing CSS custom properties from `src/styles/index.css`.
- Do not hardcode ad-hoc colors when an existing token is available.
- Preserve existing animation classes and transition timing where already used.
- Keep admin and member visual themes consistent with current palette rules.

### 2a. Theme Mode and Premium Feel Baseline
- Light mode and dark mode must both be fully supported.
- Theme switching must be token-driven and not branch-heavy in component markup.
- Theme state must persist per user session (local storage).
- Glass surfaces, cards, table headers, and focus states must keep visual depth in light mode.
- New UI work must not degrade the existing premium look and motion quality.

### 3. State and Data Pattern
- Use context for auth and cross-page session state.
- Keep UI state local to page or feature component.
- Use centralized API utility for HTTP calls.
- Replace mock database reads with API calls incrementally per module, not all at once.

### 4. UX Behavior Consistency
- Preserve current page and tab flow for admin and member journeys.
- Preserve toast and modal interaction patterns for feedback and confirmation.
- Keep loading, empty, error, and success states explicit for all API-driven screens.
- Keep role-based shell section visibility aligned with RBAC requirements.

### 5. Accessibility Baseline
- Ensure interactive elements are keyboard-reachable.
- Ensure status messages are visible and understandable without color only.
- Ensure form controls keep labels or equivalent accessible name.

## Design Change Control
Any intentional design change beyond bug fixes must be captured as a change request under `10-change-control` before implementation.

## Frontend Done Criteria
- Screen behavior matches existing design baseline.
- No mock data dependency for implemented module screens.
- API error states are handled with user-facing feedback.
- TypeScript types are aligned with documented API contracts.
- Light and dark mode parity is verified for all modified screens.

## Change Log
| Version | Date | Updated By | Summary |
|---|---|---|---|
| 1.1.0 | 2026-05-24 | Frontend Lead | Added mandatory dual-mode theme policy and premium light-mode quality guardrails |
| 1.0.0 | 2026-05-24 | Frontend Lead | Initial implementation pattern guide aligned to existing design baseline |

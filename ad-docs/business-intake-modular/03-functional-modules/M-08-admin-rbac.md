# M-08 Admin RBAC

## In Scope
Three fixed roles, password + captcha login, role-scoped shell sections, dashboard cards, audit viewer, authenticated footer

## Out of Scope
Custom role builder and deferred role types

## Acceptance Focus
Access control accuracy, admin audit visibility, and current shell section gating

## Current Shell Notes
- The authenticated admin experience renders a left sidebar, top header, scrollable body, and footer.
- The visible admin tabs currently cover dashboard, approvals, logs, ops, and the current settings pages.
- Menu-management data exists in the backend for admin and Sreni navigation support, but it is not exposed as a top-level authenticated shell screen.

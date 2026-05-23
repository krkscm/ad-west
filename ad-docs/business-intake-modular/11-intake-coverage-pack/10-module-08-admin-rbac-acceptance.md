# Module 08 Acceptance Baseline: Admin Portal and RBAC

## In-Scope Capabilities
- Admin roles: Super Admin, Zone Admin, Sreny Admin.
- TOTP MFA.
- Role-based menu visibility.
- Dashboard widgets for pending approvals, tickets, programs, members, duplicate alerts.
- Audit log viewer for Zone Admin and Super Admin.

## Acceptance Criteria
- Only three MVP roles are assignable.
- MFA enrollment and verification works reliably.
- Menus and actions are restricted by role and scope.
- Dashboard shows required operational cards.
- Audit log viewer enforces authorized access.

## Exclusions to Enforce
- Custom role builder.
- Additional deferred role types.

## Test Evidence Checklist
- [ ] Role-permission matrix tests.
- [ ] MFA success and failure-path tests.
- [ ] Dashboard visibility tests.
- [ ] Audit log access control tests.

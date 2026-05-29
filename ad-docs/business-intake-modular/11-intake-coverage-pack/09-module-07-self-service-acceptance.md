# Module 07 Acceptance Baseline: Member Self-Service Portal

## In-Scope Capabilities
- Public verification using name and phone or email.
- Password + captcha login.
- Member profile and membership view.
- Contact edit requests with simple approve or reject.
- Program and attendance history view.
- Helpdesk ticket raise and tracking.

## Acceptance Criteria
- Verification succeeds only for valid member identity.
- Captcha is required for login and expires after 3 minutes.
- Account lockout is enforced after repeated failed login attempts.
- Member can submit edit request and receive status outcome.
- Program and attendance history match source data.
- Helpdesk actions are visible in member view.

## Exclusions to Enforce
- SMS-based login delivery.
- Job board access.
- Multi-level edit approval workflows.

## Test Evidence Checklist
- [ ] Verification and password+captcha login tests.
- [ ] Session expiry and replay protection tests.
- [ ] Edit-request workflow tests.
- [ ] Data consistency checks for member views.

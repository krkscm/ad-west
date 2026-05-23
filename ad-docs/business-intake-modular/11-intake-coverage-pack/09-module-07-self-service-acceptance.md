# Module 07 Acceptance Baseline: Member Self-Service Portal

## In-Scope Capabilities
- Public verification using name and phone or email.
- Email OTP session with 10-minute expiry.
- Member profile and membership view.
- Contact edit requests with simple approve or reject.
- Program and attendance history view.
- Helpdesk ticket raise and tracking.

## Acceptance Criteria
- Verification succeeds only for valid member identity.
- OTP expires after 10 minutes and cannot be reused.
- Member can submit edit request and receive status outcome.
- Program and attendance history match source data.
- Helpdesk actions are visible in member view.

## Exclusions to Enforce
- SMS-based OTP.
- Job board access.
- Multi-level edit approval workflows.

## Test Evidence Checklist
- [ ] Verification and OTP tests.
- [ ] Session expiry and replay protection tests.
- [ ] Edit-request workflow tests.
- [ ] Data consistency checks for member views.

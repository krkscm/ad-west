# Backend Endpoint Catalog (Core Business)

## Scope
Catalog of required Core Business endpoints for modules M-01 to M-08.

## Conventions
- Base path prefix for all routes: `/api/v1`
- Auth labels:
  - `public`: no token
  - `member`: member token required
  - `admin`: admin token required

## M-01 Organizational Structure
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /org/zones | admin | List zones |
| POST | /org/zones | admin | Create zone |
| PATCH | /org/zones/:zoneId | admin | Update zone metadata |
| GET | /org/srenies | admin | List srenies by zone |
| POST | /org/srenies | admin | Create sreny |
| PATCH | /org/srenies/:srenyId | admin | Update sreny |
| GET | /org/sthans | admin | List sthans by sreny |
| POST | /org/sthans | admin | Create sthan |
| PATCH | /org/sthans/:sthanId | admin | Update sthan linkage |

## M-02 Master Contact CRM
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /contacts | admin | Search and list contacts |
| POST | /contacts | admin | Create contact |
| GET | /contacts/:contactId | admin | Get contact detail |
| PATCH | /contacts/:contactId | admin | Update contact core fields |
| DELETE | /contacts/:contactId | admin | Soft delete contact |
| POST | /contacts/:contactId/memberships | admin | Add membership assignment |
| DELETE | /contacts/:contactId/memberships/:membershipId | admin | Remove membership assignment |
| GET | /org/sreni-definitions/:sreniId/contacts | admin | List Sreni contact-list rows (paginated) |
| POST | /org/sreni-definitions/:sreniId/contacts/upload | admin | Upload Excel (.xlsx/.xls) for a Sreni contact list; replaces existing rows for that Sreni |
| DELETE | /org/sreni-definitions/:sreniId/contacts | admin | Clear all contact-list rows for a Sreni |

## M-03 Import and Deduplication
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /imports/contacts | admin | Upload and start import job |
| GET | /imports | admin | List import batches with optional status filter |
| GET | /imports/:importId | admin | Get import status and summary |
| GET | /imports/:importId/duplicates | admin | List detected duplicates |
| GET | /imports/:importId/reconciliation | admin | Get duplicate reconciliation summary and finalize eligibility |
| POST | /imports/:importId/duplicates/:duplicateId/merge | admin | Merge duplicate pair |
| POST | /imports/:importId/duplicates/:duplicateId/skip | admin | Skip duplicate pair |
| POST | /imports/:importId/finalize | admin | Finalize import decisions |
| POST | /imports/:importId/fail | admin | Mark import as failed with reason |

## M-04 Program and Event Management
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /programs | admin | List programs |
| POST | /programs | admin | Create program |
| GET | /programs/:programId | admin | Get program detail |
| PATCH | /programs/:programId | admin | Update program |
| POST | /programs/:programId/publish | admin | Publish program |
| POST | /programs/:programId/archive | admin | Archive program |
| POST | /programs/:programId/sessions | admin | Create session |
| PATCH | /programs/:programId/sessions/:sessionId | admin | Update session |
| POST | /programs/:programId/registrations | admin | Register member |
| DELETE | /programs/:programId/registrations/:registrationId | admin | Cancel registration |

## M-05 Attendance
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /attendance/sessions/:sessionId/records | admin | Mark attendance for one member |
| POST | /attendance/sessions/:sessionId/bulk-upload | admin | Upload CSV attendance |
| GET | /attendance/sessions/:sessionId | admin | Session attendance view |
| GET | /attendance/reports | admin | Attendance report query |
| GET | /attendance/reports/export | admin | Export attendance report |

## M-06 Helpdesk
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /helpdesk/tickets | member | Create ticket |
| GET | /helpdesk/tickets | admin | List tickets with filters |
| GET | /helpdesk/tickets/:ticketId | admin | Get ticket detail |
| GET | /helpdesk/tickets/:ticketId/activity | admin | Get ticket activity timeline |
| PATCH | /helpdesk/tickets/:ticketId/status | admin | Update ticket status |
| PATCH | /helpdesk/tickets/:ticketId/assignee | admin | Assign ticket owner |
| POST | /helpdesk/tickets/:ticketId/comments | admin | Add ticket comment |
| GET | /helpdesk/tickets/my | member | List logged-in member tickets |

## Core Runtime Readiness
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /core/persistence/readiness | admin | Report Core Business persistence readiness blockers and next steps |

## M-07 Member Self-Service
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /auth/captcha | public | Get captcha challenge |
| POST | /auth/login | public | Neutral credential login with captcha |
| GET | /members/me/profile | member | Get own profile |
| POST | /members/me/edit-requests | member | Submit edit request |
| GET | /members/me/edit-requests | member | List own edit requests |
| GET | /members/me/programs | member | List program and attendance history |
| GET | /members/me/helpdesk-tickets | member | List own ticket history |

## M-08 Admin RBAC
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /auth/captcha | public | Get captcha challenge |
| POST | /auth/login | public | Neutral credential login with captcha |
| POST | /auth/admin/logout | admin | Logout admin session |
| GET | /admin-users | admin | List admin users |
| POST | /admin-users | admin | Create admin user |
| PATCH | /admin-users/:id/status | admin | Activate or deactivate admin |
| POST | /admin-users/:id/roles | admin | Assign admin role |
| GET | /audit-logs | admin | Query audit log |

## Notes
- Existing implemented routes should be aligned to this catalog without breaking active consumers.
- Any endpoint not in this list requires approved change control.


# MVP Plan: Zone Community Management Platform

> Based on BRS Version 1.0 | May 2026

---

## Context

The BRS describes a **13-module platform** for a hierarchical community (Zone → Sthan → Sreny) with ~500K contacts, n8n automation, and WhatsApp/email broadcasting. The core pain point is fragmented member lists across Srenies managed manually.

The BRS itself already scopes Phase 1 (web-only, English, no payments, no native app). The MVP trims Phase 1 further to the irreducible core that delivers immediate value.

---

## MVP Scope Decision

**Guiding principle:** The single biggest pain point is *fragmented, duplicate contact records across Srenies*. Every other module depends on a clean member list. The MVP must solve that first, then enable basic governance + operations on top of it.

---

## What's In the MVP

### Module 1 — Organizational Structure (Simplified)

- **Zone** creation with configurable metadata (name, logo, address)
- **Sreny** creation under a Zone (user-defined names, no hardcoded positions)
- **Governing body** positions: configurable per Sreny, assign contacts to positions
- Annual governance: define new body per year, archive previous — no fancy wizard, just a form
- **Sthan**: create Sthan records and associate them with Zone, but without full sub-Sreny independence (per BRS §5.1.2, this is Phase 2)

### Module 2 — Master Contact List & CRM

- Single master contact list at Zone level
- Core fields: Full Name, Primary/Secondary Phone, Primary/Secondary Email, DoB, Gender, Address, WhatsApp, Photo, Membership Status
- Contact belongs to one or more Srenies (many-to-many)
- Soft-delete only (BR-003)
- Audit log on name/phone/email changes
- Basic search + filter (DB-level, no Elasticsearch in MVP)

### Module 3 — Contact Import & Deduplication

- Import from **Excel (.xlsx) and CSV only** (defer VCF, Google Sheets, JSON)
- Column mapping wizard (save/reuse mappings)
- Deduplication on phone (exact, normalized) and email (case-insensitive) — top 2 priority rules only; fuzzy name matching deferred
- Side-by-side merge/skip/import-new UI for detected duplicates
- Import summary report
- **No** periodic dedup scan in MVP — manual import dedup only

### Module 4 — Program & Event Management

- Create programs per Sreny with: name, category, dates, venue, max participants, status lifecycle
- Single-day and multi-day events only (defer recurring schedules)
- Sub-sessions within a program
- Member registration (admin-manual + self-service) with waitlist enforcement
- **No** registration forms with custom fields in MVP (use standard fields)

### Module 5 — Attendance

- Attendance sheet per session: mark Present / Absent / Late / Excused
- Bulk CSV upload for attendance
- Attendance reports: per program, per member
- Export to Excel/CSV
- **No** QR code check-in in MVP

### Module 6 — Helpdesk

- Ticket submission via self-service portal (verified members only)
- Fields: Subject, Description, Category, Priority, File attachment
- Lifecycle: New → Assigned → In Progress → Resolved → Closed
- Operator assignment, comment thread, status notifications (email only — no WhatsApp in MVP)
- Basic dashboard: open count, category breakdown
- **No** SLA timers or escalation rules in MVP

### Module 7 — Member Self-Service Portal

- Public landing page: enter Name + Phone or Email
- OTP via **email only** (SMS costs and setup deferred) — expires 10 min
- View own contact record + Sreny memberships
- Request contact edits (goes to admin for approval — simple approve/reject, no multi-level chain)
- View registered programs + attendance history
- Raise + track helpdesk tickets
- **No** job board access in MVP

### Module 8 — Admin Portal & RBAC

- Roles in MVP: **Super Admin, Zone Admin, Sreny Admin** (defer Sthan Admin, Governing Body Member as distinct role, Broadcast Operator, Report Viewer, Job Board Moderator)
- MFA: TOTP only (Google Authenticator compatible)
- Role-based menu visibility
- Admin dashboard: pending approvals, open tickets, upcoming programs, recent members, duplicate alerts
- Audit log viewer (Zone Admin + Super Admin)
- **No** custom role builder in MVP — use the 3 fixed roles above

### Notifications (Minimal n8n)

Deploy n8n via Docker alongside the platform. Implement only these workflows for MVP:

| Workflow ID | Trigger | Action |
|---|---|---|
| N8N-COM-013 | Self-service portal login | OTP delivery (email) |
| N8N-COM-004 | Helpdesk ticket raised | Notify operator (email) |
| N8N-COM-005 | Ticket status change | Notify member (email) |
| N8N-COM-002 | Program registration confirmed | Confirmation email to member |

All other n8n workflows (WhatsApp, SMS, broadcast, governance reminders) deferred.

---

## What's Deferred (Post-MVP)

| Feature | Reason |
|---|---|
| Job Board & Resume module | Not core to member-list pain point |
| Broadcast Center | Depends on WhatsApp/SMS setup; complex Meta approval |
| Document repository & report submissions | Valuable but not MVP-critical |
| Approval workflow engine (multi-level) | Replaced by simple approve/reject in MVP |
| Fuzzy/phonetic name deduplication | DB phone+email matching covers 80% of duplicates |
| QR code attendance | Nice-to-have; CSV bulk covers the need |
| Recurring program schedules | Simple date-range covers most events |
| Sthan sub-Sreny independence | Explicitly Phase 2 in BRS |
| Custom role builder | Fixed 3-role model sufficient for MVP |
| Arabic/Malayalam localization | Phase 2 per BRS |
| Elasticsearch for contact search | PostgreSQL full-text search sufficient at MVP scale |
| WhatsApp & SMS notifications | Requires BSP procurement + Meta template approvals |
| Periodic deduplication scan | Manual import dedup solves the immediate pain |

---

## Tech Stack

Aligned with BRS §8.1 recommendations.

| Layer | Choice | Note |
|---|---|---|
| Frontend | React + TypeScript + Tailwind CSS | BRS-recommended |
| Backend | NestJS (Node.js) | BRS-recommended; opinionated, fits RBAC/module structure |
| Database | PostgreSQL | Primary store; full-text search for contacts |
| Cache / Sessions | Redis | Session tokens, OTP store |
| File Storage | MinIO (self-hosted) | S3-compatible; defer AWS S3 to reduce early cost |
| Workflow Automation | n8n (Docker, minimal workflows) | Subset listed above |
| Auth | JWT + TOTP MFA | Google Authenticator compatible |
| Containerization | Docker Compose | Single-host to start; Kubernetes post-MVP |

---

## Data Model (MVP Essentials)

```
Zone              id, name, description, logo_url, address, active_year
Sreny             id, zone_id, name, description, is_service_sreny
GovBodyStructure  id, sreny_id, year, positions[] (jsonb)
GovBodyAssignment id, structure_id, contact_id, position_name, start_date, end_date

Contact           id, zone_id, first_name, last_name, phone_primary, phone_secondary,
                  email_primary, email_secondary, whatsapp, dob, gender, address,
                  photo_url, status (active/inactive)
SrenyMembership   contact_id, sreny_id, joined_date, status

ImportBatch       id, zone_id, filename, status, summary{}, created_by, created_at
DedupCandidate    id, batch_id, incoming{}, matched_contact_id, resolution

Program           id, sreny_id, name, category, start_date, end_date, venue,
                  max_participants, status, description
ProgramSession    id, program_id, date, start_time, end_time, venue
Registration      id, program_id, contact_id, status (registered/waitlisted), registered_at
Attendance        id, session_id, contact_id, status, method

HelpdeskTicket    id, contact_id, zone_id, category, subject, description,
                  priority, status, assigned_to, created_at
TicketComment     id, ticket_id, author_id, author_type (admin/member), body, created_at

EditRequest       id, contact_id, requested_fields{}, status, reviewed_by, reviewed_at

AdminUser         id, name, email, password_hash, totp_secret, mfa_enabled
RoleAssignment    id, admin_user_id, role, scope_type, scope_id
AuditLog          id, actor_id, action, entity_type, entity_id, old_val{}, new_val{}, ts
```

---

## Phased Delivery (~16 weeks, team of 2–3)

### Sprint 1–2 (Weeks 1–4): Foundation
- Project scaffolding: NestJS monorepo, React app, Docker Compose, PostgreSQL, Redis, MinIO
- Auth: login, TOTP MFA, JWT sessions, role middleware
- Zone + Sreny CRUD
- Admin dashboard shell (empty cards)

### Sprint 3–4 (Weeks 5–8): Contacts Core
- Master contact list: create, edit, search, filter, soft-delete
- Audit log on contact changes
- Sreny membership linking
- Contact import wizard: Excel/CSV upload → column mapping → save mapping → preview → commit
- Deduplication: phone + email exact match → side-by-side UI → merge/skip/new

### Sprint 5–6 (Weeks 9–12): Programs + Attendance
- Program CRUD with session builder
- Registration: admin-manual enroll + waitlist
- Attendance sheet per session
- Bulk CSV attendance upload
- Attendance reports + Excel export

### Sprint 7 (Weeks 13–14): Self-Service Portal
- Public verification form → email OTP → session
- Member profile view + contact edit request
- My programs + attendance history
- n8n: OTP delivery, program confirmation email

### Sprint 8 (Weeks 15–16): Helpdesk + Wrap-up
- Ticket submission (self-service + admin)
- Operator assignment + comment thread
- Status notifications via n8n (email)
- Admin audit log viewer
- Deduplication import report polish
- Accessibility pass, responsive QA

---

## Key Risks

| Risk | Mitigation |
|---|---|
| Initial data quality of Sreny Excel exports is poor | Build forgiving import wizard with rich validation feedback early |
| WhatsApp BSP procurement delays | MVP ships with email-only notifications; WhatsApp is a post-MVP plug-in via n8n |
| Governing body "annual rotation" UX complexity | Simplify MVP to: copy last year's structure, reassign contacts, archive old one |
| GDPR/UAE data law compliance | Implement soft-delete + data erasure endpoint from day one; don't retrofit |

---

*Based on BRS_Zone_Community_Management_Platform.docx — Version 1.0 | May 2026 | Business Confidential*

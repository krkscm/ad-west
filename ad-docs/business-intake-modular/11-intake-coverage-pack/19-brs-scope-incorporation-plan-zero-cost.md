# BRS Scope Incorporation Plan (Zero-Cost Constraint)

## Purpose
Incorporate the detailed scope from the new BRS into the current ADWest implementation path while preserving the existing stack and enforcing these constraints:
- No n8n integration in current phase.
- No messaging system in current phase (email, SMS, WhatsApp all deferred).
- Development and deployment must remain free of cost.

## Constraint Baseline
- Frontend: React + TypeScript (keep as-is).
- Backend: NestJS (keep as-is).
- Database: PostgreSQL (keep as-is).
- Styling: SCSS (current project standard).
- Hosting model: self-hosted local/VPS-capable free tooling only.

## Current Implementation Snapshot
- API modules present: core-business, user-management, health.
- Web pages present: admin login, admin dashboard, member portal.
- Existing capability baseline already aligns with M-01 to M-08 structure at Core Business depth.

## Scope Incorporation Strategy

### Phase A: Normalize BRS into Core Business+ Backlog (No Stack Change)
- Convert BRS FR items into backlog epics under M-01 to M-08.
- Tag each FR item with one of: Implement Now, Defer, Phase-2.
- Keep DS controls active for deferred items.

### Phase B: Implement In-Scope Enhancements Module-by-Module

#### M-01 Organizational Structure
- Add missing governance rotation lifecycle endpoints and UI states.
- Keep Sthan as partial implementation with explicit Phase-2 indicator.

#### M-02 Master Contact CRM
- Extend contact schema fields to match BRS minimum profile where still missing.
- Preserve single master contact list and Sreny membership links.

#### M-03 Import and Dedup
- Keep Excel/CSV import baseline.
- Keep exact phone/email dedup as primary rule-set.
- Keep fuzzy and periodic dedup scan deferred.

#### M-04 Program and Event
- Keep single and multi-day support in Core Business+.
- Defer recurring and complex custom schedule patterns.

#### M-05 Attendance
- Keep manual + CSV methods.
- Defer QR check-in and advanced eligibility threshold automation.

#### M-06 Helpdesk
- Keep ticket lifecycle and assignment/comment flow.
- Keep SLA and escalation engine deferred.

#### M-07 Member Self-Service
- Keep profile view, edit request, helpdesk, and registration history.
- Keep lookup/login hardening and approval workflows simplified.

#### M-08 Admin RBAC
- Keep fixed role model in current phase.
- Keep custom role builder deferred.

### Phase C: Explicitly Deferred by Directive
- n8n integration (all workflow IDs).
- Messaging channels: email, SMS, WhatsApp notifications and broadcast.
- Job board and resume module.
- Document repository and versioning module.

## Zero-Cost Delivery Pattern

### Development
- Local Node.js + npm for API/web.
- Local PostgreSQL Community Edition.
- SQL bootstrap via ad-docs/database-script scripts.

### Deployment
- Single-host self-managed deployment using Docker Compose-compatible services only where needed.
- No paid SaaS dependencies required for Core Business+ runtime.
- Keep outbound integrations optional and disabled by default.

## Acceptance Gate Updates
- Any story requiring n8n or messaging is blocked by scope control.
- Any story requiring paid vendor/service must include a free alternative or be deferred.
- Any addition must preserve current stack choices and API/web modular boundaries.

## Delivery Sequence (Practical)
1. Re-baseline traceability matrix from new BRS FR list to M-01..M-08.
2. Fill functional gaps that do not violate deferred controls.
3. Execute end-to-end validation with local API + web + PostgreSQL only.
4. Lock release candidate with deferred-scope sign-off.

## Change Control Rule
No item marked deferred in this plan can be pulled into the active release without Sponsor approval and documented cost impact.


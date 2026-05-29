# Development Handoff Rules

- Every intake module maps to SDLC and acceptance artifacts.
- Deferred items cannot enter Core Business sprint backlog without approved change.
- Handoff artifacts must reference module IDs and requirement IDs.
- Backend development requires approved API boundary, endpoint catalog, and request-response contracts.
- Frontend integration cannot start until backend contract docs and integration checklist are baselined.
- Frontend implementation must follow the approved frontend implementation pattern guide and screen-to-module API map.
- Any codebase change not already captured in documentation must update the corresponding doc files before handoff completion.
- Any implementation-phase database change must include an executable PostgreSQL script in ad-docs/database-script, with ordered naming and run sequence.
- Core Business persistence migration must follow 11-core-business-persistence-migration-strategy.md before UAT handoff.


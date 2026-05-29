# Document Standard

- Use stable IDs for modules and requirements.
- Record owner, status, and updated date.
- Keep business intake free from implementation details.
- Link each module to handoff and acceptance docs.
- Any code change or new code artifact must include corresponding documentation updates in the same delivery cycle.
- Documentation updates are required before marking implementation tasks complete.
- Any database schema, index, or data-migration change must be delivered as an executable script under ad-docs/database-script with ordered naming and run instructions.
- Database scripts for this project are PostgreSQL-only; do not maintain multi-DB script variants.
